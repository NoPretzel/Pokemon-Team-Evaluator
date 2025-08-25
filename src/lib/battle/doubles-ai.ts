import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

interface PokemonData {
  species: string;
  types: string[];
  stats: any;
  moves: string[];
  position: string;
  condition: string;
  slot?: number;
  targetPosition?: number;
  switchedInThisTurn?: boolean;
  fakeOutUsed?: boolean;
  lastMove?: string | null;
  turnsOut?: number;
  protectCount?: number;
}

interface ActivePokemon {
  p1: { slot0: PokemonData | null; slot1: PokemonData | null };
  p2: { slot0: PokemonData | null; slot1: PokemonData | null };
}

interface FieldConditions {
  weather?: string;
  terrain?: string;
  trickRoom: boolean;
  tailwind: { [side: string]: boolean };
}

export class DoublesAI {
  private stream: any;
  private playerSide: 'p1' | 'p2';
  private gen: any;
  private statBoosts: Record<string, Record<string, number>> = {};
  private fieldConditions: FieldConditions = {
    trickRoom: false,
    tailwind: {}
  };
  private activePokemon: ActivePokemon = {
    p1: { slot0: null, slot1: null },
    p2: { slot0: null, slot1: null }
  };
  
  constructor(stream: any) {
    this.stream = stream;
    this.playerSide = 'p1';
    if (stream.battle) {
      this.playerSide = stream.battle.mySide?.id || 'p1';
    } else if (stream.side) {
      this.playerSide = stream.side.id;
    }
    
    const gens = new Generations(Dex);
    this.gen = gens.get(9);
  }
  
  async start(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (this.stream.side) {
      this.playerSide = this.stream.side.id;
    }
    
    for await (const chunk of this.stream) {
      const lines: string[] = chunk.split('\n').filter((line: string) => line);
      
      for (const line of lines) {
        if (line.startsWith('|error|')) {
          console.error(`${this.playerSide} received error:`, line);
        }
        
        // Track various battle events
        this.trackFieldConditions(line);
        
        if (line.includes('|-boost|') || line.includes('|-unboost|')) {
          this.trackStatChange(line);
        }
        
        if (line.includes('|switch|') || line.includes('|drag|') || line.includes('|replace|')) {
          this.trackPokemonSwitch(line);
        }
        
        if (line.includes('|faint|')) {
          this.trackFaint(line);
        }
        
        if (line.includes('|move|')) {
          this.trackMove(line);
        }
        
        if (line.startsWith('|request|')) {
          const requestData = line.slice(9);
          if (requestData && requestData !== 'null') {
            try {
              const request = JSON.parse(requestData);
              
              const decision = this.makeDecision(request);
              
              if (decision) {
                this.stream.write(decision);
              }
            } catch (e) {
              console.error(`${this.playerSide} parse error:`, e);
              this.stream.write('default');
            }
          }
        }
      }
    }
  }
  
  private trackFieldConditions(line: string): void {
    // Weather
    if (line.includes('|-weather|')) {
      const match = line.match(/\|-weather\|(.+?)(\||$)/);
      if (match) {
        this.fieldConditions.weather = match[1];
      }
    }
    
    // Trick Room
    if (line.includes('|-fieldstart|move: Trick Room')) {
      this.fieldConditions.trickRoom = true;
    }
    if (line.includes('|-fieldend|move: Trick Room')) {
      this.fieldConditions.trickRoom = false;
    }
    
    // Tailwind
    if (line.includes('|-sidestart|') && line.includes('Tailwind')) {
      const match = line.match(/\|-sidestart\|(.+?): /);
      if (match) {
        this.fieldConditions.tailwind[match[1]] = true;
      }
    }
    if (line.includes('|-sideend|') && line.includes('Tailwind')) {
      const match = line.match(/\|-sideend\|(.+?): /);
      if (match) {
        this.fieldConditions.tailwind[match[1]] = false;
      }
    }
    
    // Update turn tracking at end of turn
    if (line.includes('|turn|')) {
      // Update all active Pokemon turn counters
      for (const side of ['p1', 'p2'] as const) {
        for (const slot of ['slot0', 'slot1'] as const) {
          const pokemon = this.activePokemon[side][slot];
          if (pokemon) {
            pokemon.turnsOut = (pokemon.turnsOut || 0) + 1;
            pokemon.switchedInThisTurn = false;
          }
        }
      }
    }
  }
  
  private trackPokemonSwitch(line: string): void {
    const match = line.match(/\|(switch|drag|replace)\|(.+?)\|(.+?)(?:,|$)/);
    if (!match) return;
    
    const position = match[2];
    const speciesInfo = match[3];
    const side = position.startsWith('p1') ? 'p1' : 'p2';
    const slot = position.includes('a') ? 'slot0' : 'slot1';
    
    const speciesName = speciesInfo.split(',')[0];
    const species = this.gen.species.get(speciesName);
    
    const pokemonData: PokemonData = {
      species: speciesName,
      types: species?.types || [],
      stats: species?.baseStats || {},
      moves: [],
      position: position,
      condition: '100/100',
      switchedInThisTurn: true,
      fakeOutUsed: false,
      lastMove: null,
      turnsOut: 0
    };
    
    // Mark Fake Out as used if this Pokemon previously used it
    const previousData = this.activePokemon[side as 'p1' | 'p2'][slot as 'slot0' | 'slot1'];
    if (previousData && previousData.species === speciesName && previousData.fakeOutUsed) {
      pokemonData.fakeOutUsed = true;
    }
    
    this.activePokemon[side as 'p1' | 'p2'][slot as 'slot0' | 'slot1'] = pokemonData;
    this.statBoosts[position] = {};
  }
  
  private trackFaint(line: string): void {
    const match = line.match(/\|faint\|(.+)/);
    if (!match) return;
    
    const position = match[1];
    const side = position.startsWith('p1') ? 'p1' : 'p2';
    const slot = position.includes('a') ? 'slot0' : 'slot1';
    
    this.activePokemon[side as 'p1' | 'p2'][slot as 'slot0' | 'slot1'] = null;
  }
  
  private trackMove(line: string): void {
    const match = line.match(/\|move\|(.+?)\|(.+?)(?:\|(.+?))?/);
    if (!match) return;
    
    const user = match[1];
    const moveName = match[2];
    const moveId = moveName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const side = user.startsWith('p1') ? 'p1' : 'p2';
    const slot = user.includes('a') ? 'slot0' : 'slot1';
    
    const pokemon = this.activePokemon[side as 'p1' | 'p2'][slot as 'slot0' | 'slot1'];
    if (pokemon) {
      // Track move in moveset
      if (!pokemon.moves.includes(moveName)) {
        pokemon.moves.push(moveName);
      }
      
      // Track last move used
      pokemon.lastMove = moveId;
      
      // Mark Fake Out as used
      if (moveId === 'fakeout') {
        pokemon.fakeOutUsed = true;
      }
      
      // Track Protect usage
      if (['protect', 'detect', 'spikyshield', 'wideguard'].includes(moveId)) {
        pokemon.protectCount = (pokemon.protectCount || 0) + 1;
      } else {
        pokemon.protectCount = 0; // Reset if using non-protect move
      }
      
      // Update switched in status
      pokemon.switchedInThisTurn = false;
    }
  }
  
  private trackStatChange(line: string): void {
    const match = line.match(/\|-(boost|unboost)\|(.+?)\|(.+?)\|(.+)/);
    if (!match) return;
    
    const type = match[1];
    const pokemon = match[2];
    const stat = match[3];
    const stages = match[4];
    
    if (!this.statBoosts[pokemon]) {
      this.statBoosts[pokemon] = {};
    }
    
    const currentBoost = this.statBoosts[pokemon][stat] || 0;
    const change = parseInt(stages) * (type === 'boost' ? 1 : -1);
    this.statBoosts[pokemon][stat] = Math.max(-6, Math.min(6, currentBoost + change));
  }
  
  private makeDecision(request: any): string | null {
    if (request.teamPreview) {
      return this.chooseDoublesLead(request);
    }
    
    if (request.forceSwitch) {
      return this.chooseDoublesSwitch(request);
    }
    
    if (request.active) {
      return this.chooseDoublesAction(request);
    }
    
    if (request.wait) {
      return null;
    }
    
    return 'default';
  }
  
  private chooseDoublesLead(request: any): string {
    const team = request.side.pokemon;
    
    const fakeOutUsers: number[] = [];
    const supporters: number[] = [];
    const intimidators: number[] = [];
    const weatherSetters: number[] = [];
    const regular: number[] = [];
    
    // Categorize Pokemon by their roles
    for (let i = 0; i < team.length; i++) {
      const pokemon = team[i];
      const moves = pokemon.moves || [];
      const ability = pokemon.ability || '';
      
      if (moves.includes('fakeout')) {
        fakeOutUsers.push(i);
      }
      
      if (ability === 'intimidate') {
        intimidators.push(i);
      }
      
      if (['drizzle', 'drought', 'snowwarning', 'sandstream'].includes(ability)) {
        weatherSetters.push(i);
      }
      
      if (moves.some((m: string) => ['followme', 'ragepowder', 'trickroom', 'tailwind', 'coaching', 'helpinghand'].includes(m))) {
        supporters.push(i);
      }
      
      regular.push(i);
    }
    
    // Determine optimal lead pair
    let lead1 = 0;
    let lead2 = 1;
    
    // Priority 1: Fake Out + Setup
    if (fakeOutUsers.length > 0) {
      lead1 = fakeOutUsers[0];
      
      // Pair with best partner
      if (weatherSetters.length > 0 && !weatherSetters.includes(lead1)) {
        lead2 = weatherSetters[0];
      } else if (supporters.length > 0 && !supporters.includes(lead1)) {
        lead2 = supporters[0];
      } else if (intimidators.length > 0 && !intimidators.includes(lead1)) {
        lead2 = intimidators[0];
      } else {
        // Find strongest attacker as partner
        lead2 = regular.find(i => i !== lead1) || 1;
      }
    }
    // Priority 2: Weather + Abuser
    else if (weatherSetters.length > 0) {
      lead1 = weatherSetters[0];
      lead2 = regular.find(i => i !== lead1) || 1;
    }
    // Priority 3: Intimidate + Attacker
    else if (intimidators.length > 0) {
      lead1 = intimidators[0];
      lead2 = regular.find(i => i !== lead1) || supporters[0] || 1;
    }
    // Priority 4: Support + Attacker
    else if (supporters.length > 0) {
      lead1 = supporters[0];
      lead2 = regular.find(i => i !== lead1) || 1;
    }
    
    // Build full team order with all 6 Pokemon
    const positions: number[] = [];
    const used = new Set<number>();
    
    // Add leads first
    positions.push(lead1 + 1);
    positions.push(lead2 + 1);
    used.add(lead1);
    used.add(lead2);
    
    const priorityOrder = [...intimidators, ...supporters, ...weatherSetters, ...fakeOutUsers]
      .filter(i => !used.has(i));
    
    for (const i of priorityOrder) {
      if (!used.has(i)) {
        positions.push(i + 1);
        used.add(i);
      }
    }
    
    // Then add the rest
    for (let i = 0; i < team.length; i++) {
      if (!used.has(i)) {
        positions.push(i + 1);
        used.add(i);
      }
    }
    
    // Return all 6 Pokemon
    return `team ${positions.slice(0, 6).join('')}`;
  }
  
  private chooseDoublesSwitch(request: any): string {
    const forceSwitch = request.forceSwitch;
    const team = request.side.pokemon;
    const decisions: string[] = [];
    const alreadyChosen = new Set<number>();
    
    let slotsNeedingSwitch = 0;
    let availablePokemon = 0;
    const availableIndices: number[] = [];
    
    for (let i = 0; i < forceSwitch.length; i++) {
      if (forceSwitch[i]) slotsNeedingSwitch++;
    }
    
    for (let j = 0; j < team.length; j++) {
      const pokemon = team[j];
      if (!pokemon.active && pokemon.condition && !pokemon.condition.endsWith(' fnt')) {
        availablePokemon++;
        availableIndices.push(j);
      }
    }
    
    if (slotsNeedingSwitch > availablePokemon && availablePokemon > 0) {
      if (slotsNeedingSwitch === 2 && availablePokemon === 1) {
        const switchCmd = `switch ${availableIndices[0] + 1}`;
        decisions.push(switchCmd);
        decisions.push('pass');
        return decisions.join(', ');
      }
      
      for (let i = 0; i < availablePokemon; i++) {
        decisions.push(`switch ${availableIndices[i] + 1}`);
      }
      
      return decisions.join(', ');
    }
    
    for (let i = 0; i < forceSwitch.length; i++) {
      if (forceSwitch[i]) {
        let bestSwitch = -1;
        let bestScore = -Infinity;
        
        for (let j = 0; j < team.length; j++) {
          const pokemon = team[j];
          
          if (pokemon.active) continue;
          if (alreadyChosen.has(j)) continue;
          if (!pokemon.condition || pokemon.condition.endsWith(' fnt')) continue;
          
          let score = 0;
          
          const hpPercent = this.getHPPercent(pokemon);
          score += hpPercent * 100;
          
          if (pokemon.ability === 'intimidate') {
            score += 50;
          }
          
          if (!pokemon.condition.includes(' ')) {
            score += 30;
          }
          
          score += Math.random() * 10;
          
          if (score > bestScore) {
            bestScore = score;
            bestSwitch = j;
          }
        }
        
        if (bestSwitch >= 0) {
          decisions.push(`switch ${bestSwitch + 1}`);
          alreadyChosen.add(bestSwitch);
        } else {
          for (let j = 0; j < team.length; j++) {
            if (!team[j].active && !alreadyChosen.has(j) && team[j].condition && !team[j].condition.endsWith(' fnt')) {
              decisions.push(`switch ${j + 1}`);
              alreadyChosen.add(j);
              break;
            }
          }
        }
      }
    }
    
    return decisions.join(', ');
  }
  
  private chooseDoublesAction(request: any): string {
    const decisions: string[] = [];
    
    const activePokemon = request.side.pokemon.filter((p: any) => 
      p.active && p.condition && !p.condition.endsWith(' fnt')
    );
    
    const needsSwitch = request.forceSwitch || (request.active && request.active.some((a: any) => a && a.forceSwitch));
    
    if (needsSwitch) {
      if (request.forceSwitch) {
        for (let i = 0; i < request.forceSwitch.length; i++) {
          if (request.forceSwitch[i]) {
            decisions.push(this.chooseSwitchForSlot(request, i));
          }
        }
      } else {
        for (let i = 0; i < request.active.length; i++) {
          const active = request.active[i];
          if (active && active.forceSwitch) {
            decisions.push(this.chooseSwitchForSlot(request, i));
          } else if (active) {
            decisions.push(this.chooseMoveForSlot(request, i));
          }
        }
      }
    } else {
      if (request.active) {
        if (request.active.length === 2 && activePokemon.length === 1) {
          for (let i = 0; i < request.active.length; i++) {
            const slotPokemon = request.side.pokemon[i];
            if (slotPokemon && slotPokemon.active && slotPokemon.condition && !slotPokemon.condition.endsWith(' fnt')) {
              const active = request.active[i];
              if (active && !active.forceSwitch) {
                decisions.push(this.chooseMoveForSlot(request, i));
                break;
              }
            }
          }
        } else {
          for (let i = 0; i < request.active.length; i++) {
            const active = request.active[i];
            if (active && !active.forceSwitch) {
              decisions.push(this.chooseMoveForSlot(request, i));
            }
          }
        }
      }
    }
    
    if (decisions.length === 0) {
      return 'pass';
    }
    
    return decisions.join(', ');
  }
  
  private chooseMoveForSlot(request: any, slot: number): string {
    if (!request.active || !request.active[slot]) {
      return 'move 1';
    }
    
    const active = request.active[slot];
    const moves = active.moves || [];
    const pokemon = request.side.pokemon[slot];
    
    if (!moves || moves.length === 0) {
      return 'move 1';
    }
    
    // Track if this is first turn after switch
    const myPosition = this.playerSide + (slot === 0 ? 'a' : 'b');
    const myPokemonData = this.activePokemon[this.playerSide][slot === 0 ? 'slot0' : 'slot1'];
    
    const opponents = this.getOpponentActives(request);
    const ally = slot === 0 ? request.side.pokemon[1] : request.side.pokemon[0];
    
    let bestMove = 0;
    let bestScore = -Infinity;
    let bestTarget: number | undefined;
    
    // Evaluate each move
    moves.forEach((move: any, index: number) => {
      if (move.disabled || move.pp === 0) return;
      
      // Pass Pokemon data with tracking info
      const enhancedPokemon = {
        ...pokemon,
        fakeOutUsed: myPokemonData?.fakeOutUsed || false,
        switchedInThisTurn: myPokemonData?.switchedInThisTurn,
        lastMove: myPokemonData?.lastMove
      };
      
      const moveId = move.id || move.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dexMove = this.gen.moves.get(moveId);
      
      if (!dexMove) {
        if (Math.random() > 0.5 && index !== bestMove) {
          bestMove = index;
        }
        return;
      }
      
      // For targeted moves, evaluate against each possible target
      const targetType = dexMove.target;
      
      if (targetType === 'adjacentFoe' || targetType === 'normal' || targetType === 'any') {
        // Evaluate against each possible target
        for (let targetSlot = 0; targetSlot < 2; targetSlot++) {
          const targetPos = targetSlot + 1;
          const target = opponents[targetSlot];
          
          if (target) {
            const score = this.evaluateDoublesMove(move, enhancedPokemon, [target], ally, request, slot);
            
            if (score > bestScore) {
              bestScore = score;
              bestMove = index;
              bestTarget = targetPos;
            }
          }
        }
        
        // If no specific target found, still consider the move
        if (bestTarget === undefined) {
          const score = this.evaluateDoublesMove(move, enhancedPokemon, opponents, ally, request, slot);
          if (score > bestScore) {
            bestScore = score;
            bestMove = index;
            bestTarget = 1; // Default target
          }
        }
      } else {
        const score = this.evaluateDoublesMove(move, enhancedPokemon, opponents, ally, request, slot);
        if (score > bestScore) {
          bestScore = score;
          bestMove = index;
          bestTarget = undefined;
        }
      }
    });
    
    // Construct move command
    const chosenMove = moves[bestMove];
    let command = `move ${bestMove + 1}`;
    
    if (chosenMove && chosenMove.target) {
      const target = chosenMove.target;
      
      const noTargetNeeded = [
        'self',
        'allySide',
        'allyTeam',
        'allAdjacent',
        'allAdjacentFoes',
        'all',
        'foeSide',
        'scripted',
        'randomNormal'
      ];
      
      if (!noTargetNeeded.includes(target) && bestTarget !== undefined) {
        command += ` ${bestTarget}`;
      }
    }
    
    return command;
  }
  
  private chooseSwitchForSlot(request: any, slot: number): string {
    const team = request.side.pokemon;
    let bestSwitch = -1;
    let bestScore = -Infinity;
    
    // Get current battle state
    const opponentSide = this.playerSide === 'p1' ? 'p2' : 'p1';
    const opponents = this.getOpponentActives(request);
    const allySlot = slot === 0 ? 1 : 0;
    const ally = request.side.pokemon[allySlot];
    
    for (let i = 0; i < team.length; i++) {
      const pokemon = team[i];
      
      if (pokemon.active) continue;
      if (!pokemon.condition || pokemon.condition.endsWith(' fnt')) continue;
      
      let score = 0;
      
      // Base HP score
      const hpPercent = this.getHPPercent(pokemon);
      score += hpPercent * 100;
      
      // Get species data
      const speciesName = pokemon.ident?.split(': ')[1]?.split(',')[0] || pokemon.species;
      const species = this.gen.species.get(speciesName);
      
      if (!species) continue;
      
      // Ability bonuses
      const ability = pokemon.ability || '';
      
      if (ability === 'intimidate') {
        // Check if opponents are physical attackers
        let physicalThreat = 0;
        for (const opponent of opponents) {
          if (opponent && opponent.stats) {
            if (opponent.stats.atk > opponent.stats.spa) {
              physicalThreat += 100;
            }
          }
        }
        score += physicalThreat + 100; // Base value for Intimidate
      }
      
      // Weather abilities
      if (['drizzle', 'drought', 'snowwarning', 'sandstream'].includes(ability)) {
        score += 80;
        
        // Check if team benefits from this weather
        if (ally && ally.active) {
          const allyTypes = this.gen.species.get(ally.ident?.split(': ')[1]?.split(',')[0])?.types || [];
          if (ability === 'drought' && allyTypes.includes('Fire')) score += 50;
          if (ability === 'drizzle' && allyTypes.includes('Water')) score += 50;
        }
      }
      
      // Fake Out potential
      const moves = pokemon.moves || [];
      if (moves.includes('fakeout') && !pokemon.fakeOutUsed) {
        score += 150; // Very valuable to get Fake Out pressure
      }
      
      // Type matchup evaluation
      if (species.types && opponents.length > 0) {
        let typeScore = 0;
        
        for (const opponent of opponents) {
          if (!opponent || !opponent.types) continue;
          
          // Defensive matchup
          for (const oppType of opponent.types) {
            const effectiveness = this.calculateTypeEffectiveness(oppType, species.types);
            if (effectiveness < 1) typeScore += 30;
            else if (effectiveness > 1) typeScore -= 30;
          }
          
          // Offensive matchup
          for (const move of moves) {
            const moveData = this.gen.moves.get(move);
            if (moveData && moveData.basePower > 0) {
              const effectiveness = this.calculateTypeEffectiveness(moveData.type, opponent.types);
              if (effectiveness > 1) typeScore += 20;
            }
          }
        }
        
        score += typeScore;
      }
      
      // Speed tier consideration
      const speed = species.baseStats.spe;
      if (this.fieldConditions.trickRoom) {
        score += (100 - speed) / 2; // Slower is better
      } else {
        score += speed / 4;
        if (this.fieldConditions.tailwind[this.playerSide]) {
          score += 30;
        }
      }
      
      // Support capabilities
      if (moves.some(m => ['followme', 'ragepowder', 'helpinghand', 'coaching'].includes(m))) {
        score += 60;
      }
      
      // Spread move bonus
      if (moves.some(m => {
        const moveData = this.gen.moves.get(m);
        return moveData && ['allAdjacentFoes', 'allAdjacent'].includes(moveData.target);
      })) {
        score += 40;
      }
      
      // Status penalty
      if (pokemon.condition.includes(' ')) {
        const status = pokemon.condition.split(' ')[1];
        if (status === 'slp' || status === 'frz') score -= 100;
        else if (status === 'par') score -= 40;
        else if (status === 'brn') score -= 30;
        else if (status === 'psn' || status === 'tox') score -= 25;
      }
      
      // Synergy with ally
      if (ally && ally.active) {
        score += this.evaluateSwitchSynergy(pokemon, ally);
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestSwitch = i;
      }
    }
    
    if (bestSwitch >= 0) {
      return `switch ${bestSwitch + 1}`;
    }
    
    // Fallback
    for (let i = 0; i < team.length; i++) {
      if (!team[i].active && team[i].condition && !team[i].condition.endsWith(' fnt')) {
        return `switch ${i + 1}`;
      }
    }
    
    return 'switch 3';
  }
  
  private evaluateSwitchSynergy(pokemon: any, ally: any): number {
    let synergy = 0;
    
    const ability = pokemon.ability || '';
    const allyAbility = ally.ability || '';
    const moves = pokemon.moves || [];
    const allyMoves = ally.moves || [];
    
    // Lightning Rod + Electric moves
    if (ability === 'lightningrod' && allyMoves.some(m => m === 'discharge')) {
      synergy += 100;
    }
    
    // Storm Drain + Water moves
    if (ability === 'stormdrain' && allyMoves.some(m => m === 'surf')) {
      synergy += 100;
    }
    
    // Telepathy + Earthquake
    if (ability === 'telepathy' && allyMoves.includes('earthquake')) {
      synergy += 80;
    }
    
    // Follow Me/Rage Powder + Setup
    if (moves.some(m => ['followme', 'ragepowder'].includes(m)) && 
        allyMoves.some(m => ['dragondance', 'swordsdance', 'nastyplot', 'calmmind'].includes(m))) {
      synergy += 120;
    }
    
    // Helping Hand + Strong attacker
    if (moves.includes('helpinghand')) {
      const allySpecies = this.gen.species.get(ally.ident?.split(': ')[1]?.split(',')[0]);
      if (allySpecies && (allySpecies.baseStats.atk > 120 || allySpecies.baseStats.spa > 120)) {
        synergy += 80;
      }
    }
    
    return synergy;
  }
  
  private evaluateDoublesMove(move: any, pokemon: any, opponents: PokemonData[], ally: any, request: any, slot: number): number {
    let score = 0;
    
    const moveId = move.id || move.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dexMove = this.gen.moves.get(moveId);
    
    if (!dexMove) {
      return move.basePower || 0;
    }
    
    const basePower = dexMove.basePower || 0;
    const moveCategory = dexMove.category;
    const moveType = dexMove.type;
    const movePriority = dexMove.priority || 0;
    const moveTarget = dexMove.target;
    const moveAccuracy = dexMove.accuracy === true ? 100 : (dexMove.accuracy || 100);
    
    // Get Pokemon HP
    const hpPercent = this.getHPPercent(pokemon);
    const allyHP = ally ? this.getHPPercent(ally) : 0;
    
    // Check game state
    const myTeam = request.side.pokemon || [];
    const myHealthyCount = myTeam.filter((p: any) => p.condition && !p.condition.endsWith(' fnt')).length;
    const isWinning = myHealthyCount >= 5; // We have 5+ healthy Pokemon
    
    if (moveId === 'fakeout') {
      if (!pokemon.fakeOutUsed && pokemon.switchedInThisTurn !== false) {
        // Always use Fake Out when available, but slightly less priority if winning
        return isWinning ? 1500 : 2000;
      }
      return -200; // Never use if already used
    }
    
    // Protect logic
    if (moveId === 'protect' || moveId === 'detect' || moveId === 'spikyshield' || moveId === 'wideguard') {
      // Never spam protect
      if (pokemon.lastMove === moveId) {
        return -300;
      }
      
      // Count how many times we've used Protect recently
      const protectCount = pokemon.protectCount || 0;
      if (protectCount >= 2) {
        return -100; // Avoid using too much
      }
      
      let protectScore = 0;
      
      // Turn 1 protect can be good to scout
      if (request.turn === 1 && !pokemon.moves.includes('fakeout')) {
        protectScore += 200;
      }
      
      // Always protect when very low HP
      if (hpPercent < 0.25) {
        protectScore += 600;
      } else if (hpPercent < 0.4) {
        protectScore += 400;
      } else if (hpPercent < 0.6) {
        protectScore += 200;
      }
      
      // Protect while ally sets up or uses powerful move
      if (ally && ally.active) {
        const allyMoves = ally.moves || [];
        // Check if ally might be setting up this turn
        if (allyMoves.some((m: string) => ['trickroom', 'tailwind', 'dragondance', 'swordsdance', 'nastyplot', 'calmmind'].includes(m))) {
          protectScore += 300;
        }
        // Protect if ally is using a powerful spread move
        if (allyMoves.some((m: string) => ['earthquake', 'surf', 'discharge', 'makeitrain'].includes(m))) {
          protectScore += 250;
        }
      }
      
      // Protect against obvious threats
      for (const opponent of opponents) {
        if (opponent && opponent.lastMove) {
          // They used a setup move last turn, they'll attack now
          if (['swordsdance', 'nastyplot', 'dragondance'].includes(opponent.lastMove)) {
            protectScore += 300;
          }
        }
      }
      
      // Wide Guard against spread moves
      if (moveId === 'wideguard') {
        for (const opponent of opponents) {
          if (opponent && opponent.moves) {
            if (opponent.moves.some((m: string) => ['rockslide', 'earthquake', 'heatwave', 'dazzlinggleam', 'bleakwindstorm'].includes(m))) {
              protectScore += 200;
            }
          }
        }
      }
      
      // Spiky Shield bonus (Ogerpon)
      if (moveId === 'spikyshield') {
        protectScore += 50; // Better than regular Protect
      }
      
      return Math.max(protectScore, 100); // Always at least decent
    }
    
    if (moveId === 'trickroom') {
      if (this.fieldConditions.trickRoom) {
        // Consider reversing it if we're fast
        const mySpeed = pokemon.stats?.spe || 80;
        return mySpeed > 90 ? 200 : -100;
      }
      // Set up Trick Room if we're slow
      const teamSpeed = this.evaluateTeamSpeed(request);
      return teamSpeed < 70 ? 600 : 200;
    }
    
    if (moveId === 'tailwind') {
      if (this.fieldConditions.tailwind[this.playerSide]) {
        return -100;
      }
      return 500; // Tailwind is amazing in doubles
    }
    
    if (['followme', 'ragepowder'].includes(moveId)) {
      if (!ally || !ally.active) return 0;
      
      let redirectScore = 200; // Base value - always good
      
      // Critical situations for redirection
      // 1. Protect low HP ally
      if (allyHP < 0.3) {
        redirectScore += 600;
      } else if (allyHP < 0.5) {
        redirectScore += 400;
      }
      
      // 2. Protect ally that's setting up
      const allyMoves = ally.moves || [];
      if (allyMoves.some(m => ['trickroom', 'tailwind', 'dragondance', 'swordsdance', 'nastyplot', 'calmmind'].includes(m))) {
        // Check if ally used a setup move recently
        if (ally.lastMove && ['trickroom', 'tailwind', 'dragondance', 'swordsdance', 'nastyplot', 'calmmind'].includes(ally.lastMove)) {
          redirectScore += 500; // They're mid-setup, protect them!
        } else {
          redirectScore += 300; // They might set up
        }
      }
      
      // 3. We're healthy and can tank hits
      if (hpPercent > 0.8) {
        redirectScore += 150;
      }
      
      // 4. Protect high value allies
      const allySpecies = this.gen.species.get(ally.species || ally.ident?.split(': ')[1]?.split(',')[0]);
      if (allySpecies) {
        // Protect offensive powerhouses
        if (allySpecies.baseStats.atk > 130 || allySpecies.baseStats.spa > 130) {
          redirectScore += 200;
        }
        // Protect support Pokemon
        if (allyMoves.some(m => ['trickroom', 'tailwind', 'helpinghand'].includes(m))) {
          redirectScore += 150;
        }
      }
      
      // 5. Don't spam it
      if (pokemon.lastMove === moveId) {
        redirectScore *= 0.7;
      }
      
      return redirectScore;
    }
    
    // Support moves
    if (moveId === 'helpinghand') {
      if (!ally || !ally.active) return 0;
      
      // Check if ally is about to attack
      const allySpecies = this.gen.species.get(ally.species || ally.ident?.split(': ')[1]?.split(',')[0]);
      if (allySpecies) {
        const allyPower = Math.max(allySpecies.baseStats.atk, allySpecies.baseStats.spa);
        if (allyPower > 120) {
          return 400; // Help strong attackers
        } else if (allyPower > 100) {
          return 250;
        }
      }
      return 100;
    }
    
    if (moveId === 'coaching') {
      if (!ally || !ally.active) return 0;
      
      const allySpecies = this.gen.species.get(ally.species || ally.ident?.split(': ')[1]?.split(',')[0]);
      if (allySpecies && allySpecies.baseStats.atk > 110) {
        return 350; // Great for physical attackers
      }
      return 50;
    }
    
    // Weather/Terrain setup
    if (['sunnyday', 'raindance', 'sandstorm', 'snowscape', 'electricterrain', 'grassyterrain', 'psychicterrain', 'mistyterrain'].includes(moveId)) {
      // Check if we benefit from this weather/terrain
      const weatherScore = this.evaluateWeatherBenefit(moveId, pokemon, ally);
      return weatherScore;
    }
    
    // Entry hazards are less valuable in doubles
    if (['stealthrock', 'spikes', 'toxicspikes'].includes(moveId)) {
      return 20; // Very low priority
    }
    
    // Spread moves get significant bonus
    if (['allAdjacentFoes', 'allAdjacent'].includes(moveTarget) && basePower > 0) {
      score += basePower;
      
      // Check how many targets we can hit
      const aliveOpponents = opponents.filter(o => o !== null).length;
      if (aliveOpponents >= 2) {
        score *= 1.75; // 75% bonus for hitting both
      } else {
        score *= 1.2; // Still good for positioning
      }
      
      // STAB
      if (this.hasSTAB(pokemon, moveType)) {
        score *= 1.5;
      }
      
      // Type effectiveness average
      let totalEffectiveness = 0;
      let targetCount = 0;
      
      for (const opponent of opponents) {
        if (opponent && opponent.types) {
          const effectiveness = this.calculateTypeEffectiveness(moveType, opponent.types);
          totalEffectiveness += effectiveness;
          targetCount++;
        }
      }
      
      if (targetCount > 0) {
        score *= (totalEffectiveness / targetCount);
      }
      
      // Accuracy matters more for spread moves
      score *= (moveAccuracy / 100);
    }
    // Single target damaging moves
    else if (basePower > 0 && moveCategory !== 'Status') {
      score += basePower;
      
      // STAB
      if (this.hasSTAB(pokemon, moveType)) {
        score *= 1.5;
      }
      
      // Priority moves are more valuable in doubles
      if (movePriority > 0) {
        score += 50;
        if (hpPercent < 0.4) {
          score += 100; // Finish off low HP targets
        }
      }
      
      // High power moves
      if (basePower >= 120) {
        score += 30;
      }
      
      // Accuracy consideration
      score *= (moveAccuracy / 100);
    }
    
    // Status moves
    if (moveCategory === 'Status' && !['protect', 'detect', 'wideguard', 'followme', 'ragepowder', 'helpinghand', 'coaching'].includes(moveId)) {
      // Screens are excellent in doubles
      if (['reflect', 'lightscreen', 'auroraveil'].includes(moveId)) {
        return 350; // Very high value
      }
      
      // Status conditions
      if (['thunderwave', 'willowisp', 'toxic', 'spore', 'sleeppowder'].includes(moveId)) {
        let statusScore = 100;
        
        // Target the bigger threat
        for (const opponent of opponents) {
          if (!opponent || opponent.condition?.includes(' ')) continue;
          
          // Thunder Wave fast threats
          if (moveId === 'thunderwave' && opponent.stats?.spe > 100) {
            statusScore = Math.max(statusScore, 250);
          }
          
          // Will-O-Wisp physical attackers
          if (moveId === 'willowisp' && opponent.stats && opponent.stats.atk > opponent.stats.spa) {
            statusScore = Math.max(statusScore, 250);
          }
          
          // Sleep is incredibly powerful
          if (['spore', 'sleeppowder'].includes(moveId)) {
            statusScore = Math.max(statusScore, 300);
          }
        }
        
        return statusScore;
      }
      
      // Stat boosting moves (less valuable in doubles)
      if (['swordsdance', 'dragondance', 'nastyplot', 'calmmind'].includes(moveId)) {
        // Only set up if we have protection or speed control
        if (this.fieldConditions.trickRoom || this.fieldConditions.tailwind[this.playerSide]) {
          return 200;
        }
        if (ally && ['followme', 'ragepowder'].includes(ally.lastMove || '')) {
          return 250;
        }
        return 50; // Risky without protection
      }
    }
    
    // Avoid using the same move too much (except key moves)
    const repeatableMoves = ['protect', 'detect', 'wideguard', 'fakeout', 'followme', 'ragepowder'];
    if (!repeatableMoves.includes(moveId) && pokemon.lastMove === moveId) {
      score *= 0.6;
    }
    
    // Bonus for moves that work well together
    if (ally && ally.active && ally.lastMove) {
      score += this.evaluateMoveCombo(moveId, ally.lastMove);
    }
    
    return Math.max(score, 1); // Never return 0 for valid moves
  }
  
  private evaluateTeamSpeed(request: any): number {
    const team = request.side.pokemon;
    let totalSpeed = 0;
    let count = 0;
    
    for (const pokemon of team) {
      if (pokemon.active || !pokemon.condition?.endsWith(' fnt')) {
        const species = this.gen.species.get(pokemon.ident?.split(': ')[1]?.split(',')[0] || pokemon.species);
        if (species && species.baseStats) {
          totalSpeed += species.baseStats.spe;
          count++;
        }
      }
    }
    
    return count > 0 ? totalSpeed / count : 80;
  }
  
  private evaluateWeatherBenefit(weather: string, pokemon: any, ally: any): number {
    let score = 100;
    
    // Check if either Pokemon benefits
    const checkPokemon = (pkmn: any) => {
      if (!pkmn) return 0;
      
      const ability = pkmn.ability || '';
      const types = pkmn.types || [];
      
      switch (weather) {
        case 'sunnyday':
          if (ability === 'chlorophyll') return 200;
          if (types.includes('Fire')) return 150;
          if (types.includes('Water')) return -50;
          break;
        case 'raindance':
          if (ability === 'swiftswim') return 200;
          if (types.includes('Water')) return 150;
          if (types.includes('Fire')) return -50;
          break;
        case 'sandstorm':
          if (ability === 'sandrush') return 200;
          if (types.includes('Rock')) return 100;
          break;
      }
      return 0;
    };
    
    score += checkPokemon(pokemon);
    score += checkPokemon(ally);
    
    return score;
  }
  
  private evaluateMoveCombo(myMove: string, allyMove: string): number {
    // Discharge + Lightning Rod/Motor Drive
    if (myMove === 'discharge' && ['lightningrod', 'motordrive'].includes(allyMove)) {
      return 100;
    }
    
    // Surf + Water Absorb/Storm Drain
    if (myMove === 'surf' && ['waterabsorb', 'stormdrain'].includes(allyMove)) {
      return 100;
    }
    
    // Earthquake + Flying/Levitate
    if (myMove === 'earthquake' && allyMove === 'protect') {
      return 50;
    }
    
    // Helping Hand + Attack
    if (myMove === 'helpinghand' && ['earthquake', 'rockslide', 'heatwave'].includes(allyMove)) {
      return 100;
    }
    
    return 0;
  }
  
  private getOpponentActives(request: any): PokemonData[] {
    const opponentSide = this.playerSide === 'p1' ? 'p2' : 'p1';
    const opponents: PokemonData[] = [];
    
    const slot0 = this.activePokemon[opponentSide].slot0;
    const slot1 = this.activePokemon[opponentSide].slot1;
    
    if (slot0) {
      opponents.push({
        ...slot0,
        slot: 0,
        targetPosition: 1
      });
    }
    
    if (slot1) {
      opponents.push({
        ...slot1,
        slot: 1,
        targetPosition: 2
      });
    }
    
    return opponents;
  }
  
  private hasSTAB(pokemon: any, moveType: string): boolean {
    if (!pokemon || !moveType) return false;
    
    let speciesName = '';
    if (pokemon.ident) {
      const parts = pokemon.ident.split(': ');
      if (parts[1]) {
        speciesName = parts[1].split(',')[0];
      }
    } else if (pokemon.species) {
      speciesName = pokemon.species;
    } else if (pokemon.details) {
      speciesName = pokemon.details.split(',')[0];
    }
    
    if (!speciesName) return false;
    
    const species = this.gen.species.get(speciesName);
    
    if (species && species.types) {
      return species.types.includes(moveType);
    }
    
    return false;
  }
  
  private calculateTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
    if (!moveType || !defenderTypes) return 1;
    
    let effectiveness = 1;
    for (const defType of defenderTypes) {
      const attackingType = this.gen.types.get(moveType);
      if (!attackingType || !attackingType.effectiveness) continue;
      
      if (attackingType.effectiveness[defType] !== undefined) {
        effectiveness *= attackingType.effectiveness[defType];
      }
    }
    
    return effectiveness;
  }
  
  private getHPPercent(pokemon: any): number {
    if (!pokemon || !pokemon.condition) return 0;
    
    const condition = pokemon.condition;
    if (condition.endsWith(' fnt')) return 0;
    
    const parts = condition.split('/');
    if (parts.length !== 2) return 0;
    
    const current = parseInt(parts[0]);
    const max = parseInt(parts[1]);
    
    if (isNaN(current) || isNaN(max) || max === 0) return 0;
    
    return current / max;
  }
}
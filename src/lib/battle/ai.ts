import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

export class RulesBasedAI {
  private stream: any;
  private playerSide: 'p1' | 'p2';
  private statBoosts: Record<string, any> = {};
  private gen: any;
  
  constructor(stream: any) {
    this.stream = stream;
    this.playerSide = 'p1';
    if (stream.battle) {
      this.playerSide = stream.battle.mySide?.id || 'p1';
    } else if (stream.side) {
      this.playerSide = stream.side.id;
    }
    
    // Initialize generations for Gen 9
    const gens = new Generations(Dex);
    this.gen = gens.get(9);
  }
  
  async start() {
    // Give the stream a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Now we should be able to get the correct side
    if (this.stream.side) {
      this.playerSide = this.stream.side.id;
    }
    
    for await (const chunk of this.stream) {
      const lines = chunk.split('\n').filter(line => line);
      
      for (const line of lines) {
        if (line.startsWith('|error|')) {
          console.error(`${this.playerSide} received error:`, line);
        }
        
        // Track stat changes
        if (line.includes('|-boost|') || line.includes('|-unboost|')) {
          this.trackStatChange(line);
        }
        
        // Reset boosts on switch
        if (line.includes('|switch|')) {
          const match = line.match(/\|switch\|(.+?)\|/);
          if (match) {
            const slot = match[1];
            if (slot.startsWith(this.playerSide)) {
              this.statBoosts[slot] = {};
            }
          }
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
  
  private trackStatChange(line: string) {
    const match = line.match(/\|-(boost|unboost)\|(.+?)\|(.+?)\|(.+)/);
    if (match) {
      const [, type, pokemon, stat, stages] = match;
      if (!this.statBoosts[pokemon]) {
        this.statBoosts[pokemon] = {};
      }
      
      const currentBoost = this.statBoosts[pokemon][stat] || 0;
      const change = parseInt(stages) * (type === 'boost' ? 1 : -1);
      this.statBoosts[pokemon][stat] = Math.max(-6, Math.min(6, currentBoost + change));
    }
  }
  
  private makeDecision(request: any): string | null {
    // Team preview
    if (request.teamPreview) {
      return 'team 123456';
    }
    
    // Forced switch
    if (request.forceSwitch) {
      return this.chooseSwitch(request);
    }
    
    // Active turn
    if (request.active && request.active[0]) {
      return this.chooseAction(request);
    }
    
    // Wait
    if (request.wait) {
      return null;
    }
    
    return 'default';
  }
  
  private chooseSwitch(request: any): string {
    const team = request.side.pokemon;
    const opponent = this.getOpponentActive(request);
    
    let bestSwitchIndex = 1;
    let bestScore = -Infinity;
    
    // Evaluate each Pokemon
    for (let i = 1; i < team.length; i++) {
      const pokemon = team[i];
      if (pokemon && pokemon.condition && !pokemon.condition.endsWith(' fnt')) {
        let score = 0;
        
        // HP percentage
        const hpPercent = this.getHPPercent(pokemon);
        score += hpPercent * 100;
        
        // No status
        if (!pokemon.condition.includes(' ')) {
          score += 30;
        }
        
        // Type matchup if we know the opponent
        if (opponent && opponent.speciesForme) {
          const matchupScore = this.evaluateTypeMatchup(pokemon, opponent);
          score += matchupScore;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestSwitchIndex = i;
        }
      }
    }
    
    return `switch ${bestSwitchIndex + 1}`;
  }
  
  private chooseAction(request: any): string {
    const active = request.active[0];
    const moves = active.moves || [];
    const pokemon = request.side.pokemon[0];
    const opponent = this.getOpponentActive(request);
    
    // Check if forced to switch
    if (active.forceSwitch) {
      return this.chooseSwitch(request);
    }
    
    // If no moves available
    if (!moves || moves.length === 0) {
      return 'struggle';
    }
    
    // Check if we should switch
    if (!active.trapped && pokemon) {
      const hpPercent = this.getHPPercent(pokemon);
      if (hpPercent < 0.25 && this.canSwitch(request)) {
        return this.chooseSwitch(request);
      }
    }
    
    // Choose best move
    let bestMoveIndex = 0;
    let bestScore = -Infinity;
    
    moves.forEach((move: any, index: number) => {
      if (move.disabled || move.pp === 0) return;
      
      let score = this.evaluateMove(move, pokemon, opponent, request);
      
      if (score > bestScore) {
        bestScore = score;
        bestMoveIndex = index;
      }
    });
    
    return `move ${bestMoveIndex + 1}`;
  }
  
  private evaluateMove(move: any, pokemon: any, opponent: any, request: any): number {
    let score = 0;
    
    // Get move data from gen
    const moveId = move.id || move.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dexMove = this.gen.moves.get(moveId);
    
    if (!dexMove) {
      // Fallback to basic evaluation
      return move.basePower || 0;
    }
    
    const basePower = dexMove.basePower || 0;
    const moveCategory = dexMove.category;
    const moveType = dexMove.type;
    const movePriority = dexMove.priority || 0;
    
    // Get current pokemon's boost state
    const pokemonIdent = `${this.playerSide}a: ${pokemon.ident.split(': ')[1]}`;
    const currentBoosts = this.statBoosts[pokemonIdent] || {};
    
    // Damaging moves
    if (basePower > 0 && moveCategory !== 'Status') {
      score += basePower;
      
      // Accuracy
      const accuracy = dexMove.accuracy;
      if (accuracy && accuracy !== true && typeof accuracy === 'number') {
        score *= (accuracy / 100);
      }
      
      // STAB
      if (this.hasSTAB(pokemon, moveType)) {
        score *= 1.5;
      }
      
      // Type effectiveness using @pkmn
      if (opponent && opponent.types) {
        const effectiveness = this.calculateTypeEffectiveness(moveType, opponent.types);
        score *= effectiveness;
      }
      
      // Priority when low HP
      const hpPercent = this.getHPPercent(pokemon);
      if (hpPercent < 0.3 && movePriority > 0) {
        score += 100;
      }
    }
    
    // Status moves
    else if (moveCategory === 'Status') {
      const hpPercent = this.getHPPercent(pokemon);
      
      // Healing moves
      if (dexMove.heal || dexMove.flags?.heal || ['recover', 'roost', 'slackoff', 'synthesis'].includes(moveId)) {
        if (hpPercent < 0.6) {
          score += 200 * (1 - hpPercent);
        }
      }
      
      // Setup moves - check boosts
      else if (dexMove.boosts) {
        let canBoost = false;
        let totalBoostValue = 0;
        
        // Type the boosts properly
        const boosts = dexMove.boosts as Record<string, number>;
        
        for (const [stat, boost] of Object.entries(boosts)) {
          const currentBoost = currentBoosts[stat] || 0;
          if (currentBoost < 6 && boost > 0) {
            canBoost = true;
            totalBoostValue += boost;
          }
        }
        
        if (canBoost && hpPercent > 0.5) {
          score += 70 * totalBoostValue;
        } else if (!canBoost) {
          score = -100; // Already maxed out
        }
      }
      
      // Hazards
      else if (['stealthrock', 'spikes', 'toxicspikes'].includes(moveId) && request.turn && request.turn < 5) {
        score += 80;
      }
      
      // Status conditions
      else if (dexMove.status && opponent && !opponent.status) {
        score += 60;
      }
      
      // Protect
      else if (moveId === 'protect') {
        if (hpPercent < 0.3) {
          score += 50;
        }
      }
    }
    
    return score;
  }
  
  private calculateTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
    if (!moveType || !defenderTypes) return 1;
    
    const attackingType = this.gen.types.get(moveType);
    if (!attackingType) return 1;
    
    // Get effectiveness using @pkmn
    return attackingType.effectiveness(defenderTypes);
  }
  
  private hasSTAB(pokemon: any, moveType: string): boolean {
    if (!pokemon.details || !moveType) return false;
    
    // Get Pokemon's types from species data
    const speciesName = pokemon.ident.split(': ')[1].split(',')[0];
    const species = this.gen.species.get(speciesName);
    
    if (species && species.types) {
      return species.types.includes(moveType);
    }
    
    // Fallback to parsing from details
    const typeMatch = pokemon.details.match(/\b(Normal|Fire|Water|Electric|Grass|Ice|Fighting|Poison|Ground|Flying|Psychic|Bug|Rock|Ghost|Dragon|Dark|Steel|Fairy)\b/g);
    if (typeMatch) {
      return typeMatch.includes(moveType);
    }
    
    return false;
  }
  
  private getOpponentActive(request: any): any {
    if (request.active && request.active[0]) {
      // Try to get opponent info from the request
      const active = request.active[0];
      if (active.foe) {
        return active.foe;
      }
    }
    return null;
  }
  
  private canSwitch(request: any): boolean {
    const team = request.side.pokemon;
    for (let i = 1; i < team.length; i++) {
      const pokemon = team[i];
      if (pokemon && pokemon.condition && !pokemon.condition.endsWith(' fnt')) {
        return true;
      }
    }
    return false;
  }
  
  private evaluateTypeMatchup(pokemon: any, opponent: any): number {
    // TBD
    return 0;
  }
  
  private getHPPercent(pokemon: any): number {
    if (!pokemon.condition) return 0;
    
    const condition = pokemon.condition;
    if (condition.endsWith(' fnt')) return 0;
    
    const [current, max] = condition.split('/').map((s: string) => parseInt(s));
    return current / max;
  }
}
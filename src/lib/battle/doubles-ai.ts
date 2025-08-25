import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

export class DoublesAI {
  private stream: any;
  private playerSide: 'p1' | 'p2';
  private gen: any;
  private slotMovesSinceSwitch: Set<string>[] = [new Set(), new Set()]; // Track all moves used by each slot since switching in
  private turnNumber = 0;
  private fieldConditions = {
    auroraVeil: false,
    reflect: false,
    lightScreen: false,
    tailwind: false,
    trickRoom: false
  };
  private partnerSlot: number = -1;
  
  constructor(stream: any) {
    this.stream = stream;
    this.playerSide = 'p1';
    
    const gens = new Generations(Dex);
    this.gen = gens.get(9);
  }
  
  async start() {
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Properly identify which side we are
    let sideIdentified = false;
    
    for await (const chunk of this.stream) {
      const lines = chunk.split('\n').filter(line => line);
      
      for (const line of lines) {
        // Identify our side from request data
        if (!sideIdentified && line.startsWith('|request|')) {
          const requestData = line.slice(9);
          if (requestData && requestData !== 'null') {
            try {
              const request = JSON.parse(requestData);
              if (request.side?.id) {
                this.playerSide = request.side.id;
                sideIdentified = true;
                console.log(`[AI] Identified as player: ${this.playerSide}`);
              }
            } catch (e) {
              // Continue processing
            }
          }
        }
        
        // Track turn changes
        if (line.includes('|turn|')) {
          const match = line.match(/\|turn\|(\d+)/);
          if (match) {
            this.turnNumber = parseInt(match[1]);
            console.log(`[${this.playerSide}] Turn ${this.turnNumber} started`);
            console.log(`[${this.playerSide}] Field conditions:`, this.fieldConditions);
          }
        }
        
        // Track field conditions
        if (line.includes('|-sidestart|')) {
          const match = line.match(/\|-sidestart\|(p\d): .+?\|(.+)/);
          if (match && match[1] === this.playerSide) {
            const condition = match[2].toLowerCase();
            if (condition.includes('aurora veil')) this.fieldConditions.auroraVeil = true;
            if (condition.includes('reflect')) this.fieldConditions.reflect = true;
            if (condition.includes('light screen')) this.fieldConditions.lightScreen = true;
            console.log(`[${this.playerSide}] Field condition started: ${condition}`);
          }
        }
        
        if (line.includes('|-sideend|')) {
          const match = line.match(/\|-sideend\|(p\d): .+?\|(.+)/);
          if (match && match[1] === this.playerSide) {
            const condition = match[2].toLowerCase();
            if (condition.includes('aurora veil')) this.fieldConditions.auroraVeil = false;
            if (condition.includes('reflect')) this.fieldConditions.reflect = false;
            if (condition.includes('light screen')) this.fieldConditions.lightScreen = false;
            console.log(`[${this.playerSide}] Field condition ended: ${condition}`);
          }
        }
        
        // Track weather for tailwind/trick room
        if (line.includes('|-weather|') && line.includes('Tailwind')) {
          this.fieldConditions.tailwind = true;
        }
        if (line.includes('|-fieldstart|') && line.includes('Trick Room')) {
          this.fieldConditions.trickRoom = true;
        }
        if (line.includes('|-fieldend|') && line.includes('Trick Room')) {
          this.fieldConditions.trickRoom = false;
        }
        
        // Track when our Pokemon use moves
        if (line.includes('|move|')) {
          const match = line.match(/\|move\|(p\d)([ab]): (.+?)\|(.+?)(?:\||$)/);
          if (match && match[1] === this.playerSide) {
            const slot = match[2] === 'a' ? 0 : 1;
            const pokemon = match[3];
            const move = match[4].toLowerCase().replace(/[^a-z0-9]/g, '');
            this.slotMovesSinceSwitch[slot].add(move);
            console.log(`[${this.playerSide}] Slot ${slot} (${pokemon}) used ${match[4]}`);
          }
        }
        
        // Track switches - clear move history for that slot
        if (line.includes('|switch|') || line.includes('|drag|')) {
          const match = line.match(/\|(switch|drag)\|(p\d)([ab]): (.+?)\|/);
          if (match && match[2] === this.playerSide) {
            const slot = match[3] === 'a' ? 0 : 1;
            this.slotMovesSinceSwitch[slot].clear();
            console.log(`[${this.playerSide}] Slot ${slot} switched to ${match[4]} - cleared move history`);
          }
        }
        
        // Process requests
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
    
    // Score each Pokemon
    const scores = team.map((p: any) => {
      let score = 0;
      
      // Aurora Veil setter
      if (p.moves?.includes('auroraveil') && p.ability === 'snowwarning') {
        score += 3000; // Ensure Alolan Ninetales leads
        console.log(`[${this.playerSide}] ${p.species} has Aurora Veil + Snow Warning - score: 3000`);
      }
      
      if (p.moves?.includes('fakeout')) score += 1500;
      
      if (p.ability === 'intimidate') score += 1000;
      
      if (p.moves?.includes('tailwind')) score += 800;
      if (p.moves?.includes('trickroom')) score += 700;
      
      if (['drought', 'drizzle', 'sandstream'].includes(p.ability)) {
        score += 600;
      }
      
      const spreads = ['earthquake', 'rockslide', 'heatwave', 'dazzlinggleam', 
                      'makeitrain', 'bleakwindstorm', 'surf', 'discharge', 'blizzard'];
      const spreadCount = p.moves?.filter((m: string) => spreads.includes(m)).length || 0;
      score += spreadCount * 400;
      
      if (p.moves?.some((m: string) => ['followme', 'ragepowder'].includes(m))) {
        score += 500;
      }
      
      return score;
    });
    
    // Get best two leads
    const indexed = scores.map((score: number, i: number) => ({score, index: i}))
      .sort((a, b) => b.score - a.score);
    
    // Build order
    const order = [indexed[0].index + 1, indexed[1].index + 1];
    for (let i = 0; i < team.length; i++) {
      if (!order.includes(i + 1)) {
        order.push(i + 1);
      }
    }
    while (order.length < 6) order.push(order.length + 1);
    
    return `team ${order.join('')}`;
  }
  
  private chooseDoublesSwitch(request: any): string {
    const decisions: string[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < request.forceSwitch.length; i++) {
      if (!request.forceSwitch[i]) continue;
      
      let best = -1;
      let bestScore = -Infinity;
      
      for (let j = 0; j < request.side.pokemon.length; j++) {
        const p = request.side.pokemon[j];
        if (p.active || used.has(j) || !p.condition || p.condition.endsWith(' fnt')) continue;
        
        let score = this.getHPPercent(p) * 100;
        if (p.ability === 'intimidate') score += 300;
        if (p.moves?.includes('fakeout')) score += 200;
        
        if (score > bestScore) {
          bestScore = score;
          best = j;
        }
      }
      
      if (best >= 0) {
        decisions.push(`switch ${best + 1}`);
        used.add(best);
      } else {
        decisions.push('pass');
      }
    }
    
    return decisions.join(', ');
  }
  
  private chooseDoublesAction(request: any): string {
    const decisions: string[] = [];
    
    // First, understand what both slots have available
    const slotInfo: any[] = [];
    for (let i = 0; i < request.active.length; i++) {
      if (request.active[i] && request.side.pokemon[i]?.active && !request.side.pokemon[i].condition?.endsWith(' fnt')) {
        slotInfo.push({
          slot: i,
          pokemon: request.side.pokemon[i],
          active: request.active[i],
          moves: request.active[i].moves || []
        });
      }
    }
    
    // Check for partner synergies
    const hasRedirection = slotInfo.some(info => 
      info.moves.some((m: any) => {
        const moveId = m.id || m.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['followme', 'ragepowder'].includes(moveId) && !m.disabled && m.pp > 0;
      })
    );
    
    const hasSetupSweeper = slotInfo.some(info => 
      info.moves.some((m: any) => {
        const moveId = m.id || m.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
        return ['swordsdance', 'nastyplot', 'dragondance', 'quiverdance', 'shellsmash', 'howl'].includes(moveId);
      })
    );
    
    for (let slot = 0; slot < request.active.length; slot++) {
      const active = request.active[slot];
      if (!active) continue;
      
      const pokemon = request.side.pokemon[slot];
      if (!pokemon?.active || pokemon.condition?.endsWith(' fnt')) continue;
      
      if (active.forceSwitch) {
        decisions.push(this.chooseSwitchForSlot(request, slot));
      } else {
        // Pass partner info for synergy decisions
        const partnerSlot = slot === 0 ? 1 : 0;
        const partnerInfo = slotInfo.find(info => info.slot === partnerSlot);
        decisions.push(this.chooseMoveForSlot(request, slot, partnerInfo, hasRedirection, hasSetupSweeper));
      }
    }
    
    return decisions.join(', ') || 'pass';
  }
  
  private chooseMoveForSlot(request: any, slot: number, partnerInfo?: any, hasRedirection?: boolean, hasSetupSweeper?: boolean): string {
    const active = request.active[slot];
    const moves = active.moves || [];
    const pokemon = request.side.pokemon[slot];
    
    if (!moves || moves.length === 0) {
      return 'move 1 1';
    }
    
    let bestMove = 0;
    let bestScore = -Infinity;
    let bestTarget = 1;
    
    console.log(`[${this.playerSide}] Turn ${this.turnNumber}: Choosing move for ${pokemon.ident} (slot ${slot})`);
    console.log(`  Aurora Veil active: ${this.fieldConditions.auroraVeil}`);
    
    if (pokemon.ability === 'snowwarning' || pokemon.species?.toLowerCase().includes('ninetales-alola')) {
      const auroraVeilIndex = moves.findIndex((m: any) => {
        const moveId = m.id || m.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
        return moveId === 'auroraveil';
      });
      
      if (auroraVeilIndex !== -1 && !moves[auroraVeilIndex].disabled && moves[auroraVeilIndex].pp > 0) {
        if (!this.fieldConditions.auroraVeil) {
          console.log(`  Aurora Veil available and MUST be used!`);
          return `move ${auroraVeilIndex + 1}`;
        }
      }
    }
    
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (move.disabled || move.pp === 0) continue;
      
      const moveId = move.id || move.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dexMove = this.gen.moves.get(moveId);
      if (!dexMove) continue;
      
      let score = 0;
      let needsTarget = false;
      
      // Auroral Veil
      if (moveId === 'auroraveil' && !this.fieldConditions.auroraVeil) {
        score = 10000;
        console.log(`  Aurora Veil: ${score}`);
      }
      // Fake Out
      else if (moveId === 'fakeout') {
        // Check if Fake Out has already been used by this slot
        if (this.slotMovesSinceSwitch[slot].has('fakeout')) {
          console.log(`  Fake Out: SKIPPING (already used since switch)`);
          continue;
        } else {
          score = 9000;
          needsTarget = true;
          console.log(`  Fake Out: ${score} (AVAILABLE - not used since switch)`);
        }
      }
      // Redirection
      else if (['followme', 'ragepowder'].includes(moveId) && hasSetupSweeper && partnerInfo) {
        // Check if partner has setup moves available
        const partnerHasSetup = partnerInfo.moves.some((m: any) => {
          const pMoveId = m.id || m.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
          return ['swordsdance', 'nastyplot', 'dragondance', 'howl'].includes(pMoveId) && !m.disabled && m.pp > 0;
        });
        
        if (partnerHasSetup) {
          score = 8000; // Very high priority to protect setup
          console.log(`  ${moveId}: ${score} (Protecting partner's setup)`);
        } else {
          score = 350;
        }
      }
      // Setup moves
      else if (['swordsdance', 'nastyplot', 'dragondance', 'howl'].includes(moveId) && hasRedirection) {
        const hp = this.getHPPercent(pokemon);
        if (hp > 0.6) {
          score = 7000; // High priority with redirection support
          console.log(`  ${moveId}: ${score} (Setup with redirection support)`);
        }
      }
      // Spread Moves
      else if (['allAdjacentFoes', 'allAdjacent'].includes(dexMove.target) && dexMove.basePower > 0) {
        score = dexMove.basePower * 2.5;
        if (this.hasSTAB(pokemon, dexMove.type)) score *= 1.5;
        
        // Bonus for key doubles spread moves
        const bonuses: Record<string, number> = {
          'earthquake': 200,
          'rockslide': 180,
          'heatwave': 150,
          'dazzlinggleam': 150,
          'makeitrain': 200,
          'bleakwindstorm': 180,
          'blizzard': 170,
          'icywind': 100  // Weaker but speed control
        };
        if (moveId in bonuses) score += bonuses[moveId];
        
        // Extra bonus for Blizzard in hail/snow
        if (moveId === 'blizzard' && pokemon.ability === 'snowwarning') {
          score += 300; // Blizzard never misses in hail
        }
      }
      // Protect
      else if (['protect', 'detect', 'wideguard', 'spikyshield', 'burningbulwark'].includes(moveId)) {
        const hp = this.getHPPercent(pokemon);
        score = hp < 0.3 ? 400 : hp < 0.5 ? 200 : 50;
      }
      // Speed Control
      else if (['tailwind', 'trickroom', 'icywind', 'electroweb'].includes(moveId)) {
        score = 500;
        if (this.turnNumber <= 2) score += 200; // Higher priority early
      }
      // Support
      else if (['helpinghand'].includes(moveId)) {
        score = 350;
        // Higher value if partner has strong attacks available
        if (partnerInfo && partnerInfo.moves.some((m: any) => {
          const pMove = this.gen.moves.get(m.id || m.move?.toLowerCase().replace(/[^a-z0-9]/g, ''));
          return pMove && pMove.basePower >= 80;
        })) {
          score += 200;
        }
      }
      // Single Target Damage
      else if (dexMove.basePower > 0) {
        score = dexMove.basePower;
        if (this.hasSTAB(pokemon, dexMove.type)) score *= 1.5;
        if (dexMove.priority > 0) score += 80;
        
        // Boost score if we have Aurora Veil protection
        if (this.fieldConditions.auroraVeil) {
          score *= 1.2;
        }
        
        needsTarget = true;
      }
      // Status
      else {
        score = 80;
        if (['thunderwave', 'willowisp', 'encore'].includes(moveId)) {
          score = 250;
          needsTarget = true;
        }
      }
      
      // Update best move
      if (needsTarget) {
        for (let t = 1; t <= 2; t++) {
          if (score > bestScore) {
            bestScore = score;
            bestMove = i;
            bestTarget = t;
          }
        }
      } else {
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
          bestTarget = 0;
        }
      }
    }
    
    // Build command
    const chosenMove = moves[bestMove];
    console.log(`  Chosen: ${chosenMove?.move} (score: ${bestScore})`);
    
    let cmd = `move ${bestMove + 1}`;
    if (chosenMove) {
      const moveId = chosenMove.id || chosenMove.move?.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dexMove = this.gen.moves.get(moveId);
      
      if (dexMove && ['normal', 'any', 'adjacentFoe'].includes(dexMove.target)) {
        cmd += ` ${bestTarget}`;
      }
    }
    
    return cmd;
  }
  
  private chooseSwitchForSlot(request: any, slot: number): string {
    let best = -1;
    let bestScore = -Infinity;
    
    for (let i = 0; i < request.side.pokemon.length; i++) {
      const p = request.side.pokemon[i];
      if (p.active || !p.condition || p.condition.endsWith(' fnt')) continue;
      
      let score = this.getHPPercent(p) * 100;
      if (p.ability === 'intimidate') score += 200;
      if (p.moves?.includes('fakeout')) score += 150;
      
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    
    return best >= 0 ? `switch ${best + 1}` : 'switch 1';
  }
  
  private hasSTAB(pokemon: any, moveType: string): boolean {
    const species = this.gen.species.get(pokemon.species || pokemon.ident?.split(': ')[1]);
    return species?.types?.includes(moveType) || false;
  }
  
  private getHPPercent(pokemon: any): number {
    if (!pokemon?.condition) return 0;
    if (pokemon.condition.endsWith(' fnt')) return 0;
    const [current, max] = pokemon.condition.split('/').map(n => parseInt(n));
    return current / max || 0;
  }
}
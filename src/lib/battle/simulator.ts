import { BattleStreams, Teams } from '@pkmn/sim';
import { BattleResult, BattleSimulation } from '@/types/battle';
import { Team } from '@/types';
import { exportShowdownTeam } from '@/lib/pokemon/team-parser';
import { RulesBasedAI } from './ai';

export class BattleSimulator {
  private formatId: string;
  
  constructor(formatId: string = 'gen9ou') {
    this.formatId = formatId;
  }
  
  async simulateBattle(team1: Team, team2: Team): Promise<BattleResult> {
    const p1TeamString = exportShowdownTeam(team1);
    const p2TeamString = exportShowdownTeam(team2);
    
    const p1Team = Teams.import(p1TeamString);
    const p2Team = Teams.import(p2TeamString);
    
    if (!p1Team || !p1Team.length || !p2Team || !p2Team.length) {
      throw new Error('Failed to parse teams');
    }
    
    const battleStream = new BattleStreams.BattleStream();
    const streams = BattleStreams.getPlayerStreams(battleStream);
    
    const spec = { formatid: this.formatId };
    const p1spec = { name: 'Player 1', team: Teams.pack(p1Team) };
    const p2spec = { name: 'Player 2', team: Teams.pack(p2Team) };
    
    let winner: 'p1' | 'p2' | 'tie' = 'tie';
    let turns = 0;
    let battleStarted = false;
    let battleEnded = false;
    const battleLog: string[] = [];
    let lastActivity = Date.now();
    
    const pokemonTracking = {
      p1: new Set<string>(),
      p2: new Set<string>()
    };
    
    // Create AIs
    const p1ai = new RulesBasedAI(streams.p1);
    const p2ai = new RulesBasedAI(streams.p2);
    
    // Start AI processing
    const p1Promise = p1ai.start();
    const p2Promise = p2ai.start();
    
    // Initialize battle
    streams.omniscient.write(`>start ${JSON.stringify(spec)}`);
    streams.omniscient.write(`>player p1 ${JSON.stringify(p1spec)}`);
    streams.omniscient.write(`>player p2 ${JSON.stringify(p2spec)}`);
    
    // Process battle
    const processPromise = (async () => {
      for await (const chunk of streams.omniscient) {
        battleLog.push(chunk);
        lastActivity = Date.now();
        
        const lines = chunk.split('\n').filter(line => line);
        
        for (const line of lines) {
          // Battle start
          if (line.includes('|start|')) {
            battleStarted = true;
            console.log('Battle Started');
          }
          
          // Turn tracking
          if (line.includes('|turn|')) {
            const match = line.match(/\|turn\|(\d+)/);
            if (match) {
              turns = parseInt(match[1]);
            }
          }
          
          // Faint tracking
          if (line.includes('|faint|')) {
            const match = line.match(/\|faint\|(.+)/);
            if (match) {
              const pokemon = match[1];
              if (pokemon.startsWith('p1')) {
                pokemonTracking.p1.add(pokemon);
              } else if (pokemon.startsWith('p2')) {
                pokemonTracking.p2.add(pokemon);
              }
            }
          }
          
          // Battle end
          if (line.includes('|win|')) {
            const match = line.match(/\|win\|(.+)/);
            if (match) {
              winner = match[1].trim() === 'Player 1' ? 'p1' : 'p2';
              battleEnded = true;
              break;
            }
          }
          
          if (line.match(/^\|tie$/)) {
            winner = 'tie';
            battleEnded = true;
            break;
          }
        }
        
        if (battleEnded) break;
      }
    })();
    
    // Safety timeout - 30 seconds max per battle
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!battleEnded) {
          battleEnded = true;
        }
        resolve();
      }, 30000);
    });
    
    // Wait for battle to complete
    await Promise.race([processPromise, timeoutPromise]);
    
    // Calculate results
    const p1Remaining = 6 - pokemonTracking.p1.size;
    const p2Remaining = 6 - pokemonTracking.p2.size;
    
    // Determine winner if not already set
    if (!winner || winner === 'tie') {
      if (pokemonTracking.p1.size === 6) {
        winner = 'p2';
      } else if (pokemonTracking.p2.size === 6) {
        winner = 'p1';
      } else if (p1Remaining > p2Remaining) {
        winner = 'p1';
      } else if (p2Remaining > p1Remaining) {
        winner = 'p2';
      }
    }
    
    console.log(`Battle complete: ${turns} turns, P1: ${p1Remaining} left, P2: ${p2Remaining} left, Winner: ${winner}`);
    
    // Clean up
    try {
      streams.omniscient.writeEnd();
    } catch {}
    
    return {
      winner,
      turns,
      p1RemainingPokemon: p1Remaining,
      p2RemainingPokemon: p2Remaining,
      log: battleLog.slice(-10),
    };
  }
  
  async runSimulation(team1: Team, team2: Team, numBattles: number = 3): Promise<BattleSimulation> {
    const results: BattleResult[] = [];
    
    for (let i = 0; i < numBattles; i++) {
      console.log(`\n========== Battle ${i + 1}/${numBattles} ==========`);
      try {
        const result = await this.simulateBattle(team1, team2);
        results.push(result);
        
        // Small delay between battles
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Battle ${i + 1} failed:`, error);
        results.push({
          winner: 'tie',
          turns: 0,
          p1RemainingPokemon: 0,
          p2RemainingPokemon: 0,
          log: [],
        });
      }
    }
    
    const wins = results.filter(r => r.winner === 'p1').length;
    const winRate = (wins / numBattles) * 100;
    const avgTurns = results.reduce((sum, r) => sum + r.turns, 0) / numBattles;
    
    console.log(`\n=== Simulation Summary ===`);
    console.log(`Win rate: ${winRate}% (${wins}/${numBattles})`);
    console.log(`Average turns: ${avgTurns}`);
    
    return {
      team1: team1.pokemon.map(p => p.species).join(', '),
      team2: team2.pokemon.map(p => p.species).join(', '),
      format: this.formatId,
      results,
      winRate,
      avgTurns,
    };
  }
}
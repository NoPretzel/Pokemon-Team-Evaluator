export interface BattleResult {
  winner: 'p1' | 'p2' | 'tie';
  turns: number;
  p1RemainingPokemon: number;
  p2RemainingPokemon: number;
  log?: string[];
}

export interface BattleSimulation {
  team1: string;
  team2: string;
  format: string;
  results: BattleResult[];
  winRate: number;
  avgTurns: number;
}

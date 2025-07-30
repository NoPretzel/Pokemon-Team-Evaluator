export interface Pokemon {
  species: string;
  ability: string;
  item: string;
  nature: string;
  evs: Record<string, number>;
  ivs: Record<string, number>;
  moves: string[];
  teraType?: string;
  level?: number;
}

export interface Team {
  format: string;
  pokemon: Pokemon[];
}

export type TeamArchetype = 
  | 'Hyper Offense' 
  | 'Offense' 
  | 'Bulky Offense' 
  | 'Balance' 
  | 'Bulky Balance' 
  | 'Stall';

export interface EvaluationResult {
  archetype: TeamArchetype;
  battleSimulation: {
    wins: number;
    total: number;
    percentage: number;
  };
  typeCoverage: {
    offensive: number;
    defensive: number;
  };
  metaCoverage: {
    score: number;
    coveredThreats: string[];
    uncoveredThreats: string[];
  };
  teamChecklist: {
    passed: string[];
    missing: string[];
  };
}

export interface UsageStats {
  format: string;
  month: string;
  totalBattles: number;
  pokemon: PokemonUsage[];
  lastUpdated: string;
}

export interface PokemonUsage {
  rank: number;
  name: string;
  usage: number;
  raw: number;
  rawPercent: number;
  real: number;
  realPercent: number;
  abilities: Record<string, number>;
  items: Record<string, number>;
  spreads: Record<string, number>;
  moves: Record<string, number>;
  teammates: Record<string, number>;
  checksAndCounters: Record<string, number>;
}

export interface FormatUsageStats {
  [format: string]: UsageStats;
}
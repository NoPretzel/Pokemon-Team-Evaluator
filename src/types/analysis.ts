import { Team, Pokemon } from '@/types';
import { StatsTable } from '@smogon/calc';

export type TeamArchetype = 
  | 'Hyper Offense' 
  | 'Offense' 
  | 'Bulky Offense' 
  | 'Balance' 
  | 'Semi-Stall'
  | 'Stall'
  // Doubles archetypes
  | 'Trick Room'
  | 'Tailwind'
  | 'Weather'
  | 'Hard Trick Room'
  | 'Goodstuff';

export interface TeamAnalysis {
  archetype: TeamArchetype;
  offensiveScore: number;
  defensiveScore: number;
  speedScore: number;
  hazardControl: HazardControl;
  teamRoles: PokemonRole[];
}

export interface HazardControl {
  hasHazards: boolean;
  hasHazardRemoval: boolean;
  hazardSetters: string[];
  hazardRemovers: string[];
}

export interface PokemonRole {
  pokemon: string;
  roles: Role[];
  stats: StatsTable;
}

export type Role = 
  | 'Physical Sweeper'
  | 'Special Sweeper'
  | 'Mixed Attacker'
  | 'Physical Wall'
  | 'Special Wall'
  | 'Mixed Wall'
  | 'Pivot'
  | 'Hazard Setter'
  | 'Hazard Remover'
  | 'Cleric'
  | 'Setup Sweeper'
  | 'Wallbreaker'
  | 'Revenge Killer'
  | 'Support';

export interface MoveCategory {
  hazards: string[];
  hazardRemoval: string[];
  recovery: string[];
  status: string[];
  setup: string[];
  priority: string[];
  pivot: string[];
  cleric: string[];
}
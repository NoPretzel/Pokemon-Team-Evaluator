import { Team, Pokemon } from '@/types';
import { TeamArchetype, TeamAnalysis, PokemonRole, Role } from '@/types/analysis';
import { calculateStats, getPokemonData, getMoveData } from '@/lib/pokemon/data-service';
import { StatsTable } from '@smogon/calc';
import {
  isHazard,
  isHazardRemoval,
  isRecovery,
  isSetupMove,
  isPriorityMove,
  isPivotMove,
  isStatusMove,
} from './move-categories';

export function analyzeTeam(team: Team): TeamAnalysis {
  const pokemonRoles = team.pokemon.map(p => analyzePokemonRole(p));
  
  // Calculate team-wide scores
  const offensiveScore = calculateOffensiveScore(pokemonRoles);
  const defensiveScore = calculateDefensiveScore(pokemonRoles);
  const speedScore = calculateSpeedScore(pokemonRoles);
  
  // Determine archetype based on scores
  const archetype = determineArchetype(offensiveScore, defensiveScore, speedScore);
  
  // Check hazard control
  const hazardControl = analyzeHazardControl(team);
  
  return {
    archetype,
    offensiveScore,
    defensiveScore,
    speedScore,
    hazardControl,
    teamRoles: pokemonRoles,
  };
}

function analyzePokemonRole(pokemon: Pokemon): PokemonRole {
  const roles: Role[] = [];
  
  // Calculate actual stats
  const stats = calculateStats(
    pokemon.species,
    pokemon.level || 50,
    pokemon.evs,
    pokemon.ivs,
    pokemon.nature
  ) || getDefaultStats();
  
  // Get Pokemon data
  const pokemonData = getPokemonData(pokemon.species);
  if (!pokemonData) {
    return { pokemon: pokemon.species, roles: ['Support'], stats };
  }
  
  // Analyze based on stats and moves
  const attackRatio = stats.atk / stats.spa;
  const defenseRatio = stats.def / stats.spd;
  
  // Determine offensive roles
  if (stats.atk > 300 || (stats.atk > 250 && attackRatio > 1.2)) {
    roles.push('Physical Sweeper');
  }
  if (stats.spa > 300 || (stats.spa > 250 && attackRatio < 0.8)) {
    roles.push('Special Sweeper');
  }
  if (stats.atk > 250 && stats.spa > 250) {
    roles.push('Mixed Attacker');
  }
  
  // Determine defensive roles
  if (stats.def > 300 || (stats.def > 250 && stats.hp > 300)) {
    roles.push('Physical Wall');
  }
  if (stats.spd > 300 || (stats.spd > 250 && stats.hp > 300)) {
    roles.push('Special Wall');
  }
  if (stats.def > 250 && stats.spd > 250 && stats.hp > 300) {
    roles.push('Mixed Wall');
  }
  
  // Check moves for specific roles
  const hasSetup = pokemon.moves.some(move => isSetupMove(move));
  const hasPriority = pokemon.moves.some(move => isPriorityMove(move));
  const hasPivot = pokemon.moves.some(move => isPivotMove(move));
  const hasRecovery = pokemon.moves.some(move => isRecovery(move));
  const hasHazards = pokemon.moves.some(move => isHazard(move));
  const hasHazardRemoval = pokemon.moves.some(move => isHazardRemoval(move));
  
  if (hasSetup && (roles.includes('Physical Sweeper') || roles.includes('Special Sweeper'))) {
    roles.push('Setup Sweeper');
  }
  
  if (stats.spe > 350 || (stats.spe > 300 && hasPriority)) {
    roles.push('Revenge Killer');
  }
  
  if (hasPivot) {
    roles.push('Pivot');
  }
  
  if (hasHazards) {
    roles.push('Hazard Setter');
  }
  
  if (hasHazardRemoval) {
    roles.push('Hazard Remover');
  }
  
  // If no specific role, default to Support
  if (roles.length === 0) {
    roles.push('Support');
  }
  
  return {
    pokemon: pokemon.species,
    roles,
    stats,
  };
}

function calculateOffensiveScore(pokemonRoles: PokemonRole[]): number {
  let score = 0;
  
  for (const role of pokemonRoles) {
    const stats = role.stats;
    
    // Base offensive score on attack stats
    score += Math.max(stats.atk, stats.spa) * 0.3;
    score += stats.spe * 0.2;
    
    // Bonus for offensive roles
    if (role.roles.includes('Physical Sweeper') || role.roles.includes('Special Sweeper')) {
      score += 50;
    }
    if (role.roles.includes('Setup Sweeper')) {
      score += 30;
    }
    if (role.roles.includes('Wallbreaker')) {
      score += 40;
    }
  }
  
  return Math.round(score / pokemonRoles.length);
}

function calculateDefensiveScore(pokemonRoles: PokemonRole[]): number {
  let score = 0;
  
  for (const role of pokemonRoles) {
    const stats = role.stats;
    
    // Base defensive score on bulk
    score += stats.hp * 0.3;
    score += ((stats.def + stats.spd) / 2) * 0.4;
    
    // Bonus for defensive roles
    if (role.roles.includes('Physical Wall') || role.roles.includes('Special Wall')) {
      score += 50;
    }
    if (role.roles.includes('Mixed Wall')) {
      score += 70;
    }
    if (role.roles.includes('Support')) {
      score += 20;
    }
  }
  
  return Math.round(score / pokemonRoles.length);
}

function calculateSpeedScore(pokemonRoles: PokemonRole[]): number {
  const speeds = pokemonRoles.map(role => role.stats.spe);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const fastMons = speeds.filter(spe => spe > 300).length;
  
  return Math.round(avgSpeed + (fastMons * 20));
}

function determineArchetype(
  offensive: number,
  defensive: number,
  speed: number
): TeamArchetype {
  const ratio = offensive / defensive;
  
  if (ratio > 1.5 && speed > 320) {
    return 'Hyper Offense';
  } else if (ratio > 1.3) {
    return 'Offense';
  } else if (ratio > 1.1 && defensive > 150) {
    return 'Bulky Offense';
  } else if (ratio > 0.8 && ratio < 1.2) {
    return 'Balance';
  } else if (ratio < 0.7 && defensive > 200) {
    return 'Stall';
  } else if (ratio < 0.8) {
    return 'Semi-Stall';
  }
  
  return 'Balance'; // Default
}

function analyzeHazardControl(team: Team) {
  const hazardSetters: string[] = [];
  const hazardRemovers: string[] = [];
  
  for (const pokemon of team.pokemon) {
    const hasHazardMove = pokemon.moves.some(move => isHazard(move));
    const hasRemovalMove = pokemon.moves.some(move => isHazardRemoval(move));
    
    if (hasHazardMove) {
      hazardSetters.push(pokemon.species);
    }
    if (hasRemovalMove) {
      hazardRemovers.push(pokemon.species);
    }
  }
  
  return {
    hasHazards: hazardSetters.length > 0,
    hasHazardRemoval: hazardRemovers.length > 0,
    hazardSetters,
    hazardRemovers,
  };
}

function getDefaultStats(): StatsTable {
  return {
    hp: 100,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
  };
}
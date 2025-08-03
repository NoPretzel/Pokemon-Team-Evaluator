import { Team, Pokemon } from '@/types';
import { TeamArchetype, TeamAnalysis, PokemonRole, Role } from '@/types/analysis';
import { calculateStats, getPokemonData } from '@/lib/pokemon/data-service';
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

interface ArchetypePattern {
  items: Record<string, number>;
  moves: Record<string, number>;
  pokemon: Record<string, number>;
  minSetupMoves?: number;
  maxDefensiveMons?: number;
  minPivotMoves?: number;
  minOffensiveMons?: number;
  minBulkyMons?: number;
  requiresHazards?: boolean;
  requiresRemoval?: boolean;
  balancedRoles?: boolean;
  minWalls?: number;
  minRecoveryMoves?: number;
}

const ARCHETYPE_SIGNATURES: Record<TeamArchetype, ArchetypePattern> = {
  'Hyper Offense': {
    // Key items that appear frequently in HO teams
    items: {
      'Focus Sash': 0.8,
      'Life Orb': 0.7,
      'Choice Band': 0.6,
      'Choice Specs': 0.6,
      'Booster Energy': 0.7,
      'Weakness Policy': 0.6,
      'Light Clay': 0.9,
      'Lum Berry': 0.5,
      'White Herb': 0.5,
    },
    // Moves that define HO
    moves: {
      'Dragon Dance': 1.0,
      'Swords Dance': 1.0,
      'Nasty Plot': 1.0,
      'Shell Smash': 1.0,
      'Quiver Dance': 1.0,
      'Shift Gear': 1.0,
      'Agility': 0.8,
      'Calm Mind': 0.7,
      'Bulk Up': 0.6,
      'Iron Defense': 0.5,
      'Aurora Veil': 1.0,
      'Light Screen': 0.9,
      'Reflect': 0.9,
      'Taunt': 0.7,
      'Endeavor': 0.8,
      'Endure': 0.7,
    },
    // Common HO Pokemon
    pokemon: {
      'Grimmsnarl': 0.9,
      'Ninetales-Alola': 0.9,
      'Revavroom': 0.8,
      'Maushold': 0.8,
      'Polteageist': 0.8,
      'Iron Moth': 0.7,
      'Dragonite': 0.6,
      'Gyarados': 0.7,
      'Salamence': 0.7,
    },
    minSetupMoves: 3,
    maxDefensiveMons: 1,
  },
  
  'Offense': {
    items: {
      'Choice Scarf': 0.8,
      'Heavy-Duty Boots': 0.7,
      'Life Orb': 0.6,
      'Leftovers': 0.5,
      'Choice Band': 0.5,
      'Choice Specs': 0.5,
    },
    moves: {
      'U-turn': 0.9,
      'Volt Switch': 0.9,
      'Flip Turn': 0.9,
      'Teleport': 0.8,
      'Stealth Rock': 0.7,
      'Knock Off': 0.8,
      'Rapid Spin': 0.6,
      'Defog': 0.6,
      'Taunt': 0.6,
    },
    pokemon: {
      'Landorus-Therian': 0.8,
      'Tornadus-Therian': 0.8,
      'Zapdos-Galar': 0.7,
      'Dragapult': 0.7,
      'Great Tusk': 0.7,
      'Iron Valiant': 0.6,
      'Kingambit': 0.6,
      'Ogerpon-Wellspring': 0.6,
    },
    minPivotMoves: 2,
    minOffensiveMons: 4,
  },
  
  'Bulky Offense': {
    items: {
      'Assault Vest': 0.9,
      'Rocky Helmet': 0.8,
      'Heavy-Duty Boots': 0.8,
      'Leftovers': 0.7,
      'Air Balloon': 0.5,
      'Covert Cloak': 0.5,
    },
    moves: {
      'U-turn': 0.8,
      'Volt Switch': 0.8,
      'Flip Turn': 0.8,
      'Chilly Reception': 0.9,
      'Future Sight': 0.8,
      'Stealth Rock': 0.8,
      'Knock Off': 0.7,
      'Thunder Wave': 0.6,
      'Will-O-Wisp': 0.6,
    },
    pokemon: {
      'Slowking': 0.9,
      'Slowking-Galar': 0.9,
      'Tornadus-Therian': 0.8,
      'Heatran': 0.8,
      'Ting-Lu': 0.7,
      'Gholdengo': 0.7,
      'Zamazenta': 0.7,
      'Primarina': 0.7,
      'Hatterene': 0.7,
    },
    minBulkyMons: 2,
    minPivotMoves: 2,
  },
  
  'Balance': {
    items: {
      'Leftovers': 0.9,
      'Heavy-Duty Boots': 0.9,
      'Rocky Helmet': 0.7,
      'Black Glasses': 0.5,
      'Soul Dew': 0.5,
      'Metal Coat': 0.5,
    },
    moves: {
      'Stealth Rock': 0.9,
      'Spikes': 0.7,
      'Defog': 0.7,
      'Rapid Spin': 0.7,
      'U-turn': 0.7,
      'Volt Switch': 0.7,
      'Knock Off': 0.8,
      'Future Sight': 0.7,
      'Thunder Wave': 0.6,
      'Recover': 0.6,
      'Roost': 0.6,
      'Slack Off': 0.6,
    },
    pokemon: {
      'Ting-Lu': 0.8,
      'Gholdengo': 0.7,
      'Zamazenta': 0.7,
      'Slowking-Galar': 0.8,
      'Clefable': 0.7,
      'Corviknight': 0.7,
      'Dragonite': 0.6,
      'Moltres': 0.7,
      'Hatterene': 0.6,
    },
    requiresHazards: true,
    requiresRemoval: true,
    balancedRoles: true,
  },
  
  'Semi-Stall': {
    items: {
      'Leftovers': 0.9,
      'Rocky Helmet': 0.8,
      'Heavy-Duty Boots': 0.7,
      'Black Sludge': 0.8,
    },
    moves: {
      'Recover': 0.9,
      'Roost': 0.9,
      'Slack Off': 0.9,
      'Rest': 0.8,
      'Will-O-Wisp': 0.8,
      'Toxic': 0.8,
      'Thunder Wave': 0.7,
      'Stealth Rock': 0.7,
      'Spikes': 0.6,
    },
    pokemon: {
      'Slowking': 0.8,
      'Gliscor': 0.7,
      'Moltres': 0.7,
      'Garganacl': 0.8,
      'Ting-Lu': 0.7,
    },
    minWalls: 2,
    minRecoveryMoves: 2,
  },
  
  'Stall': {
    items: {
      'Leftovers': 1.0,
      'Rocky Helmet': 0.9,
      'Heavy-Duty Boots': 0.8,
      'Black Sludge': 0.9,
      'Eviolite': 0.7,
    },
    moves: {
      'Recover': 1.0,
      'Roost': 1.0,
      'Slack Off': 1.0,
      'Soft-Boiled': 1.0,
      'Rest': 0.9,
      'Sleep Talk': 0.9,
      'Toxic': 0.9,
      'Toxic Spikes': 0.8,
      'Will-O-Wisp': 0.8,
      'Defog': 0.9,
      'Haze': 0.8,
      'Whirlwind': 0.7,
      'Dragon Tail': 0.7,
      'Body Press': 0.8,
      'Seismic Toss': 0.9,
      'Night Shade': 0.8,
    },
    pokemon: {
      'Toxapex': 1.0,
      'Blissey': 1.0,
      'Corviknight': 0.9,
      'Dondozo': 0.9,
      'Gliscor': 0.8,
      'Weezing-Galar': 0.8,
      'Clodsire': 0.8,
      'Skeledirge': 0.7,
      'Ting-Lu': 0.7,
    },
    minWalls: 4,
    minRecoveryMoves: 3,
  },
};

export function analyzeTeam(team: Team): TeamAnalysis {
  const pokemonRoles = team.pokemon.map(p => analyzePokemonRole(p));
  
  const archetypeScores = calculateArchetypeScores(team, pokemonRoles);
  
  const archetype = determineArchetype(archetypeScores, team, pokemonRoles);
  
  const offensiveScore = calculateOffensiveScore(pokemonRoles);
  const defensiveScore = calculateDefensiveScore(pokemonRoles);
  const speedScore = calculateSpeedScore(pokemonRoles);
  
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

function calculateArchetypeScores(team: Team, pokemonRoles: PokemonRole[]): Record<TeamArchetype, number> {
  const scores: Partial<Record<TeamArchetype, number>> = {};
  
  for (const [archetype, patterns] of Object.entries(ARCHETYPE_SIGNATURES) as [TeamArchetype, ArchetypePattern][]) {
    let score = 0;
    let matches = 0;
    let totalChecks = 0;
    
    // Check items
    const teamItems = team.pokemon.map(p => p.item).filter(Boolean);
    for (const item of teamItems) {
      if (patterns.items[item]) {
        score += patterns.items[item];
        matches++;
      }
    }
    totalChecks += teamItems.length;
    
    // Check moves
    const teamMoves = team.pokemon.flatMap(p => p.moves);
    let moveMatches = 0;
    for (const move of teamMoves) {
      if (patterns.moves[move]) {
        score += patterns.moves[move];
        moveMatches++;
      }
    }
    matches += Math.min(moveMatches / 2, 3);
    totalChecks += 6;
    
    // Check Pokemon
    const teamPokemon = team.pokemon.map(p => p.species).filter(Boolean);
    for (const pokemon of teamPokemon) {
      if (patterns.pokemon[pokemon]) {
        score += patterns.pokemon[pokemon] * 2;
        matches++;
      }
    }
    totalChecks += teamPokemon.length;
    
    if (patterns.minSetupMoves !== undefined) {
      const setupMoves = teamMoves.filter(move => isSetupMove(move)).length;
      if (setupMoves >= patterns.minSetupMoves) {
        score += 2;
        matches++;
      }
      totalChecks++;
    }
    
    if (patterns.minPivotMoves !== undefined) {
      const pivotMoves = teamMoves.filter(move => isPivotMove(move)).length;
      if (pivotMoves >= patterns.minPivotMoves) {
        score += 2;
        matches++;
      }
      totalChecks++;
    }
    
    if (patterns.minWalls !== undefined) {
      const walls = pokemonRoles.filter(p => 
        p.roles.includes('Physical Wall') || 
        p.roles.includes('Special Wall') || 
        p.roles.includes('Mixed Wall')
      ).length;
      if (walls >= patterns.minWalls) {
        score += 3;
        matches++;
      }
      totalChecks++;
    }
    
    if (patterns.minRecoveryMoves !== undefined) {
      const recoveryMoves = teamMoves.filter(move => isRecovery(move)).length;
      if (recoveryMoves >= patterns.minRecoveryMoves) {
        score += 2;
        matches++;
      }
      totalChecks++;
    }
    
    if (patterns.requiresHazards) {
      const hasHazards = teamMoves.some(move => isHazard(move));
      if (hasHazards) {
        score += 1;
        matches++;
      }
      totalChecks++;
    }
    
    if (patterns.requiresRemoval) {
      const hasRemoval = teamMoves.some(move => isHazardRemoval(move));
      if (hasRemoval) {
        score += 1;
        matches++;
      }
      totalChecks++;
    }
    
    // Normalize score by number of checks
    scores[archetype] = totalChecks > 0 ? (score / totalChecks) * (matches / totalChecks) : 0;
  }
  
  // Ensure all archetypes have a score
  const allArchetypes: TeamArchetype[] = ['Hyper Offense', 'Offense', 'Bulky Offense', 'Balance', 'Semi-Stall', 'Stall'];
  for (const archetype of allArchetypes) {
    if (!(archetype in scores)) {
      scores[archetype] = 0;
    }
  }
  
  return scores as Record<TeamArchetype, number>;
}

function determineArchetype(
  scores: Record<TeamArchetype, number>,
  team: Team,
  pokemonRoles: PokemonRole[]
): TeamArchetype {
  // Find archetype with highest score
  let bestArchetype: TeamArchetype = 'Balance';
  let bestScore = 0;
  
  for (const [archetype, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestArchetype = archetype as TeamArchetype;
    }
  }
  
  // If scores are too close or too low, use additional heuristics
  if (bestScore < 0.15) {
    // Fall back to role-based analysis
    const walls = pokemonRoles.filter(p => 
      p.roles.some(r => r.includes('Wall'))
    ).length;
    
    const sweepers = pokemonRoles.filter(p => 
      p.roles.some(r => r.includes('Sweeper'))
    ).length;
    
    const setupCount = team.pokemon.flatMap(p => p.moves).filter(isSetupMove).length;
    
    if (walls >= 4) return 'Stall';
    if (setupCount >= 4 && sweepers >= 3) return 'Hyper Offense';
    if (sweepers >= 4) return 'Offense';
    if (walls >= 2 && sweepers >= 2) return 'Bulky Offense';
  }
  
  return bestArchetype;
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
  const bulkScore = (stats.hp * (stats.def + stats.spd)) / 2;
  
  // Determine offensive roles
  if (stats.atk > 350 || (stats.atk > 300 && attackRatio > 1.3)) {
    roles.push('Physical Sweeper');
  }
  if (stats.spa > 350 || (stats.spa > 300 && attackRatio < 0.7)) {
    roles.push('Special Sweeper');
  }
  if (stats.atk > 280 && stats.spa > 280) {
    roles.push('Mixed Attacker');
  }
  
  // Determine defensive roles
  if (bulkScore > 35000 || (stats.def > 300 && stats.hp > 350)) {
    roles.push('Physical Wall');
  }
  if (bulkScore > 35000 || (stats.spd > 300 && stats.hp > 350)) {
    roles.push('Special Wall');
  }
  if (stats.def > 280 && stats.spd > 280 && stats.hp > 350) {
    roles.push('Mixed Wall');
  }
  
  // Check moves for specific roles
  const hasSetup = pokemon.moves.some(move => isSetupMove(move));
  const hasPriority = pokemon.moves.some(move => isPriorityMove(move));
  const hasPivot = pokemon.moves.some(move => isPivotMove(move));
  const hasRecovery = pokemon.moves.some(move => isRecovery(move));
  const hasHazards = pokemon.moves.some(move => isHazard(move));
  const hasHazardRemoval = pokemon.moves.some(move => isHazardRemoval(move));
  const hasStatus = pokemon.moves.some(move => isStatusMove(move));
  
  // Setup roles
  if (hasSetup) {
    if (roles.includes('Physical Sweeper') || roles.includes('Special Sweeper')) {
      roles.push('Setup Sweeper');
    }
  }
  
  // Speed roles
  if (stats.spe > 380 || (stats.spe > 350 && hasPriority)) {
    roles.push('Revenge Killer');
  }
  
  // Utility roles
  if (hasPivot) {
    roles.push('Pivot');
  }
  
  if (hasHazards) {
    roles.push('Hazard Setter');
  }
  
  if (hasHazardRemoval) {
    roles.push('Hazard Remover');
  }
  
  // Wallbreaker role
  const hasCoverage = pokemon.moves.length >= 3;
  if ((stats.atk > 380 || stats.spa > 380) && hasCoverage && !hasSetup) {
    roles.push('Wallbreaker');
  }
  
  // Support role
  if (hasStatus && bulkScore > 25000) {
    roles.push('Support');
  }
  
  // Cleric role
  if (hasRecovery && (hasStatus || hasHazardRemoval)) {
    roles.push('Cleric');
  }
  
  // If no specific role, determine based on stats
  if (roles.length === 0) {
    if (Math.max(stats.atk, stats.spa) > 320) {
      roles.push(stats.atk > stats.spa ? 'Physical Sweeper' : 'Special Sweeper');
    } else if (bulkScore > 30000) {
      roles.push('Support');
    } else {
      roles.push('Pivot');
    }
  }
  
  return {
    pokemon: pokemon.species,
    roles,
    stats,
  };
}

function calculateOffensiveScore(pokemonRoles: PokemonRole[]): number {
  let score = 0;
  let count = 0;
  
  for (const role of pokemonRoles) {
    const stats = role.stats;
    let pokemonScore = 0;
    
    // Base offensive score on attack stats
    const offensiveStat = Math.max(stats.atk, stats.spa);
    pokemonScore += offensiveStat * 0.35;
    
    // Speed contribution
    pokemonScore += stats.spe * 0.15;
    
    // Role bonuses
    if (role.roles.includes('Physical Sweeper') || role.roles.includes('Special Sweeper')) {
      pokemonScore += 40;
    }
    if (role.roles.includes('Setup Sweeper')) {
      pokemonScore += 50;
    }
    if (role.roles.includes('Wallbreaker')) {
      pokemonScore += 45;
    }
    
    score += pokemonScore;
    count++;
  }
  
  return count > 0 ? Math.round(score / count) : 0;
}

function calculateDefensiveScore(pokemonRoles: PokemonRole[]): number {
  let score = 0;
  let count = 0;
  
  for (const role of pokemonRoles) {
    const stats = role.stats;
    let pokemonScore = 0;
    
    // Base defensive score on bulk
    const bulkScore = (stats.hp * (stats.def + stats.spd)) / 2;
    pokemonScore += bulkScore / 100;
    
    // Role bonuses
    if (role.roles.includes('Physical Wall') || role.roles.includes('Special Wall')) {
      pokemonScore += 50;
    }
    if (role.roles.includes('Mixed Wall')) {
      pokemonScore += 60;
    }
    if (role.roles.includes('Support')) {
      pokemonScore += 30;
    }
    if (role.roles.includes('Cleric')) {
      pokemonScore += 25;
    }
    
    score += pokemonScore;
    count++;
  }
  
  return count > 0 ? Math.round(score / count) : 0;
}

function calculateSpeedScore(pokemonRoles: PokemonRole[]): number {
  const speeds = pokemonRoles.map(role => role.stats.spe);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const fastMons = speeds.filter(spe => spe > 350).length;
  const veryFastMons = speeds.filter(spe => spe > 400).length;
  
  return Math.round(avgSpeed + (fastMons * 15) + (veryFastMons * 10));
}

function analyzeHazardControl(team: Team) {
  const hazardSetters: string[] = [];
  const hazardRemovers: string[] = [];
  
  for (const pokemon of team.pokemon) {
    if (!pokemon.species) continue;
    
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
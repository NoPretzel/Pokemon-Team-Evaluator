import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { Pokemon } from '@/types';

const gens = new Generations(Dex);
const gen = gens.get(9);

// Tera type contribution factor
export const TERA_WEIGHT = 0.16;

export type TypeName = 
  | 'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice' 
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' 
  | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';

export interface TeamCoverageRatings {
  offensive: {
    ratings: Record<TypeName, number>;
    uncovered: TypeName[];
  };
  defensive: {
    ratings: Record<TypeName, number>;
    vulnerable: TypeName[];
  };
}

// Helper function to calculate type effectiveness
function getTypeEffectiveness(attackingType: string, defendingTypes: string[]): number {
  const typeData = gen.types.get(attackingType);
  if (!typeData) return 1;
  
  let multiplier = 1;
  for (const defType of defendingTypes) {
    const effectiveness = typeData.effectiveness[defType as keyof typeof typeData.effectiveness];
    if (effectiveness !== undefined) {
      multiplier *= effectiveness;
    }
  }
  
  return multiplier;
}

// Apply ability modifications to type effectiveness
function applyAbilityModifications(
  effectiveness: number, 
  attackType: string, 
  pokemon: Pokemon
): number {
  const ability = pokemon.ability.toLowerCase().replace(/\s/g, '');
  
  // Abilities that grant immunities
  if (effectiveness > 0) {
    if ((ability === 'levitate' || ability === 'airlock' || ability === 'cloudnine') && attackType === 'Ground') {
      return 0;
    }
    if (ability === 'flashfire' && attackType === 'Fire') {
      return 0;
    }
    if (ability === 'waterabsorb' || ability === 'stormdrain' || ability === 'dryskin' && attackType === 'Water') {
      return 0;
    }
    if (ability === 'voltabsorb' || ability === 'lightningrod' || ability === 'motordrive' && attackType === 'Electric') {
      return 0;
    }
    if (ability === 'sapsipper' && attackType === 'Grass') {
      return 0;
    }
  }
  
  // Thick Fat - reduces Fire and Ice damage
  if (ability === 'thickfat' && (attackType === 'Fire' || attackType === 'Ice')) {
    return effectiveness * 0.5;
  }
  
  // Filter - reduces Fire damage
  if (ability === 'filter' || ability === 'solidrock' || ability === 'prismarmor') {
    if (effectiveness >= 2) {
      return effectiveness * 0.75;
    }
  }
  
  // Heatproof - reduces Fire damage
  if (ability === 'heatproof' && attackType === 'Fire') {
    return effectiveness * 0.5;
  }
  
  // Water Bubble - reduces Fire damage
  if (ability === 'waterbubble' && attackType === 'Fire') {
    return effectiveness * 0.5;
  }
  
  // Fluffy - doubles Fire damage
  if (ability === 'fluffy' && attackType === 'Fire') {
    return effectiveness * 2;
  }
  
  // Wonder Guard - only super effective moves hit
  if (ability === 'wonderguard' && effectiveness < 2) {
    return 0;
  }
  
  return effectiveness;
}

// Get move types including special cases
function getMoveTypes(pokemon: Pokemon): Set<string> {
  const moveTypes = new Set<string>();
  
  for (const moveName of pokemon.moves) {
    const move = gen.moves.get(moveName);
    if (move && move.basePower > 0) {
      moveTypes.add(move.type);
      
      // Special move cases
      const moveId = move.id;
      
      // Tera Blast
      if (moveId === 'terablast' && pokemon.teraType) {
        moveTypes.add(pokemon.teraType);
      }
      
      // Flying Press is both Fighting and Flying
      if (moveId === 'flyingpress') {
        moveTypes.add('Fighting');
        moveTypes.add('Flying');
      }
    }
  }
  
  return moveTypes;
}

// Analyze offensive coverage for a single Pokemon
function analyzeOffensiveCoverage(pokemon: Pokemon): Record<TypeName, number> {
  const ratings: Record<TypeName, number> = {} as Record<TypeName, number>;
  const moveTypes = getMoveTypes(pokemon);
  const hasTeraBlast = pokemon.moves.some(m => 
    gen.moves.get(m)?.name === 'Tera Blast'
  );
  
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];
  
  for (const defenderType of allTypes) {
    let maxRating = 0;
    let canHitWithoutTera = false;
    
    // Check each move type
    for (const moveType of moveTypes) {
      const effectiveness = getTypeEffectiveness(moveType, [defenderType]);
      
      // Convert effectiveness to rating
      let rating = 0;
      if (effectiveness >= 4) rating = 2;
      else if (effectiveness >= 2) rating = 1;
      
      if (rating > 0 && (!hasTeraBlast || moveType !== pokemon.teraType)) {
        canHitWithoutTera = true;
      }
      
      maxRating = Math.max(maxRating, rating);
    }
    
    // Only add tera weight if:
    // 1. Pokemon has Tera Blast
    // 2. Tera type would be super effective
    // 3. Pokemon can't already hit this type super effectively without tera
    if (hasTeraBlast && pokemon.teraType && !canHitWithoutTera) {
      const teraEffectiveness = getTypeEffectiveness(pokemon.teraType, [defenderType]);
      if (teraEffectiveness >= 2) {
        maxRating += TERA_WEIGHT;
      }
    }
    
    ratings[defenderType] = maxRating;
  }
  
  return ratings;
}

// Analyze defensive coverage for a single Pokemon
function analyzeDefensiveCoverage(pokemon: Pokemon): Record<TypeName, number> {
  const species = gen.species.get(pokemon.species);
  if (!species) throw new Error(`Unknown species: ${pokemon.species}`);
  
  const types = species.types;
  const ratings: Record<TypeName, number> = {} as Record<TypeName, number>;
  
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];
  
  for (const attackerType of allTypes) {
    // Get base effectiveness
    let effectiveness = getTypeEffectiveness(attackerType, types);
    
    // Apply ability modifications
    effectiveness = applyAbilityModifications(effectiveness, attackerType, pokemon);
    
    // Convert to rating
    let rating = 0;
    if (effectiveness === 0) rating = 3; // Immunity
    else if (effectiveness <= 0.25) rating = 2;
    else if (effectiveness <= 0.5) rating = 1;
    else if (effectiveness >= 4) rating = -2;
    else if (effectiveness >= 2) rating = -1;
    
    // If Pokemon has tera type, calculate blended rating
    if (pokemon.teraType) {
      let teraEffectiveness = getTypeEffectiveness(attackerType, [pokemon.teraType]);
      teraEffectiveness = applyAbilityModifications(teraEffectiveness, attackerType, pokemon);
      
      let teraRating = 0;
      if (teraEffectiveness === 0) teraRating = 3;
      else if (teraEffectiveness <= 0.25) teraRating = 2;
      else if (teraEffectiveness <= 0.5) teraRating = 1;
      else if (teraEffectiveness >= 4) teraRating = -2;
      else if (teraEffectiveness >= 2) teraRating = -1;
      
      // Weighted average:
      rating = rating * (1 - TERA_WEIGHT) + teraRating * TERA_WEIGHT;
    }
    
    ratings[attackerType] = rating;
  }
  
  return ratings;
}

export function analyzeTeamCoverageRatings(team: Pokemon[]): TeamCoverageRatings {
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  const teamCoverage: TeamCoverageRatings = {
    offensive: {
      ratings: {} as Record<TypeName, number>,
      uncovered: []
    },
    defensive: {
      ratings: {} as Record<TypeName, number>,
      vulnerable: []
    }
  };

  // Initialize ratings
  for (const type of allTypes) {
    teamCoverage.offensive.ratings[type] = 0;
    teamCoverage.defensive.ratings[type] = 0;
  }

  // Analyze each Pokemon
  for (const pokemon of team) {
    try {
      const offensiveRatings = analyzeOffensiveCoverage(pokemon);
      for (const type of allTypes) {
        teamCoverage.offensive.ratings[type] += offensiveRatings[type];
      }
      
      const defensiveRatings = analyzeDefensiveCoverage(pokemon);
      for (const type of allTypes) {
        teamCoverage.defensive.ratings[type] += defensiveRatings[type];
      }
    } catch (error) {
      console.error(`Error analyzing ${pokemon.species}:`, error);
    }
  }

  for (const type of allTypes) {
    teamCoverage.offensive.ratings[type] = Math.round(teamCoverage.offensive.ratings[type] * 100) / 100;
    teamCoverage.defensive.ratings[type] = Math.round(teamCoverage.defensive.ratings[type] * 100) / 100;
  }

  teamCoverage.offensive.uncovered = allTypes.filter(
    type => teamCoverage.offensive.ratings[type] === 0
  );

  teamCoverage.defensive.vulnerable = allTypes.filter(
    type => teamCoverage.defensive.ratings[type] < 0
  );

  return teamCoverage;
}
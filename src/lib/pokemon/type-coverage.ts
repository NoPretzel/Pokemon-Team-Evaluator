import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { Pokemon } from '@/types';

const gens = new Generations(Dex);
const gen = gens.get(9);

// Tera type contribution factor
const TERA_WEIGHT = 0.25;

export type TypeName = 
  | 'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice' 
  | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' 
  | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';

export interface TypeCoverage {
  offensive: {
    superEffective: TypeName[];
    neutral: TypeName[];
    notVeryEffective: TypeName[];
    noEffect: TypeName[];
    teraContribution?: TypeName[];
  };
  defensive: {
    weakTo: TypeName[];
    resistances: TypeName[];
    immunities: TypeName[];
    teraWeakTo?: TypeName[];
    teraResistances?: TypeName[];
  };
}

export interface TeamTypeCoverage {
  offensive: {
    coverage: Record<TypeName, number>;
    uncovered: TypeName[];
  };
  defensive: {
    weaknesses: Record<TypeName, number>;
    resistances: Record<TypeName, number>;
    commonWeaknesses: TypeName[];
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

function getMoveTypeWithTera(moveName: string, pokemon: Pokemon, move: any): string | null {
  const moveId = move.id || moveName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (moveId === 'terablast' && pokemon.teraType) {
    return pokemon.teraType;
  }
  
  if (moveId === 'terastarstorm' && pokemon.teraType) {
    return 'Stellar'; // Note: Stellar type might need special handling
  }
  
  if (moveId === 'ivycudgel' && pokemon.species.includes('Ogerpon')) {
    // Base form is Grass, but changes based on form
    if (pokemon.species.includes('Hearthflame')) return 'Fire';
    if (pokemon.species.includes('Wellspring')) return 'Water';
    if (pokemon.species.includes('Cornerstone')) return 'Rock';
    return 'Grass';
  }
  
  if (moveId === 'revelationdance' && pokemon.species.includes('Oricorio')) {
    const species = gen.species.get(pokemon.species);
    if (species && species.types[0]) {
      return species.types[0];
    }
  }
  
  if (moveId === 'ragingbull') {
    if (pokemon.species.includes('Paldea-Fire')) return 'Fire';
    if (pokemon.species.includes('Paldea-Water')) return 'Water';
    return 'Fighting'; // Base Tauros or Combat Breed
  }
  
  if (moveId === 'multiattack' && pokemon.species.includes('Silvally') && pokemon.item) {
    const itemToType: Record<string, string> = {
      'Bug Memory': 'Bug',
      'Dark Memory': 'Dark',
      'Dragon Memory': 'Dragon',
      'Electric Memory': 'Electric',
      'Fairy Memory': 'Fairy',
      'Fighting Memory': 'Fighting',
      'Fire Memory': 'Fire',
      'Flying Memory': 'Flying',
      'Ghost Memory': 'Ghost',
      'Grass Memory': 'Grass',
      'Ground Memory': 'Ground',
      'Ice Memory': 'Ice',
      'Poison Memory': 'Poison',
      'Psychic Memory': 'Psychic',
      'Rock Memory': 'Rock',
      'Steel Memory': 'Steel',
      'Water Memory': 'Water',
    };
    return itemToType[pokemon.item] || 'Normal';
  }
  
  if (moveId === 'judgment' && pokemon.species.includes('Arceus') && pokemon.item) {
    const plateToType: Record<string, string> = {
      'Draco Plate': 'Dragon',
      'Dread Plate': 'Dark',
      'Earth Plate': 'Ground',
      'Fist Plate': 'Fighting',
      'Flame Plate': 'Fire',
      'Icicle Plate': 'Ice',
      'Insect Plate': 'Bug',
      'Iron Plate': 'Steel',
      'Meadow Plate': 'Grass',
      'Mind Plate': 'Psychic',
      'Pixie Plate': 'Fairy',
      'Sky Plate': 'Flying',
      'Splash Plate': 'Water',
      'Spooky Plate': 'Ghost',
      'Stone Plate': 'Rock',
      'Toxic Plate': 'Poison',
      'Zap Plate': 'Electric',
    };
    return plateToType[pokemon.item] || 'Normal';
  }
  
  // Default - return the move's normal type
  return move.type;
}

export function analyzePokemonCoverage(pokemon: Pokemon): TypeCoverage {
  const species = gen.species.get(pokemon.species);
  if (!species) {
    throw new Error(`Unknown species: ${pokemon.species}`);
  }

  const types = species.types;
  const coverage: TypeCoverage = {
    offensive: {
      superEffective: [],
      neutral: [],
      notVeryEffective: [],
      noEffect: [],
      teraContribution: []
    },
    defensive: {
      weakTo: [],
      resistances: [],
      immunities: [],
      teraWeakTo: [],
      teraResistances: []
    }
  };

  // Analyze offensive coverage from moves
  const moveTypes = new Set<string>();
  const teraMoveTypes = new Set<string>(); // Types only available when tera'd
  
  for (const moveName of pokemon.moves) {
    const move = gen.moves.get(moveName);
    if (move && move.basePower > 0) {
      const moveType = getMoveTypeWithTera(moveName, pokemon, move);
      if (moveType) {
        moveTypes.add(moveType);
        
        // If this is Tera Blast and we have a tera type, track it separately
        if (move.name === 'Tera Blast' && pokemon.teraType && moveType === pokemon.teraType) {
          teraMoveTypes.add(moveType);
        }
      }
    }
  }

  // Check each type for offensive coverage
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  for (const defenderType of allTypes) {
    let bestEffectiveness = 0;
    let teraProvidesCoverage = false;
    
    for (const attackType of moveTypes) {
      const effectiveness = getTypeEffectiveness(attackType, [defenderType]);
      if (effectiveness > bestEffectiveness) {
        bestEffectiveness = effectiveness;
        if (teraMoveTypes.has(attackType) && effectiveness >= 2) {
          teraProvidesCoverage = true;
        }
      }
    }

    if (bestEffectiveness >= 2) {
      coverage.offensive.superEffective.push(defenderType);
      if (teraProvidesCoverage) {
        coverage.offensive.teraContribution!.push(defenderType);
      }
    } else if (bestEffectiveness === 1) {
      coverage.offensive.neutral.push(defenderType);
    } else if (bestEffectiveness > 0) {
      coverage.offensive.notVeryEffective.push(defenderType);
    } else {
      coverage.offensive.noEffect.push(defenderType);
    }
  }

  // Analyze defensive coverage
  for (const attackerType of allTypes) {
    const effectiveness = getTypeEffectiveness(attackerType, types);
    
    if (effectiveness >= 2) {
      coverage.defensive.weakTo.push(attackerType);
    } else if (effectiveness < 1 && effectiveness > 0) {
      coverage.defensive.resistances.push(attackerType);
    } else if (effectiveness === 0) {
      coverage.defensive.immunities.push(attackerType);
    }
    
    // Also calculate tera defensive coverage if tera type is set
    if (pokemon.teraType) {
      const teraEffectiveness = getTypeEffectiveness(attackerType, [pokemon.teraType]);
      
      if (teraEffectiveness >= 2) {
        coverage.defensive.teraWeakTo!.push(attackerType);
      } else if (teraEffectiveness < 1 && teraEffectiveness > 0) {
        coverage.defensive.teraResistances!.push(attackerType);
      } else if (teraEffectiveness === 0) {
        coverage.defensive.teraResistances!.push(attackerType); // Count immunities as resistances
      }
    }
  }

  return coverage;
}

export function analyzeTeamCoverage(team: Pokemon[]): TeamTypeCoverage {
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];

  const teamCoverage: TeamTypeCoverage = {
    offensive: {
      coverage: {} as Record<TypeName, number>,
      uncovered: []
    },
    defensive: {
      weaknesses: {} as Record<TypeName, number>,
      resistances: {} as Record<TypeName, number>,
      commonWeaknesses: []
    }
  };

  // Initialize counters
  for (const type of allTypes) {
    teamCoverage.offensive.coverage[type] = 0;
    teamCoverage.defensive.weaknesses[type] = 0;
    teamCoverage.defensive.resistances[type] = 0;
  }

  // Analyze each Pokemon
  for (const pokemon of team) {
    try {
      const coverage = analyzePokemonCoverage(pokemon);
      const hasTeraBlast = pokemon.moves.some(m => 
        gen.moves.get(m)?.name === 'Tera Blast'
      );
      
      // Count offensive coverage
      for (const type of coverage.offensive.superEffective) {
        teamCoverage.offensive.coverage[type]++;
      }
      
      // Only add tera contribution if Pokemon has Tera Blast
      if (hasTeraBlast && coverage.offensive.teraContribution) {
        for (const type of coverage.offensive.teraContribution) {
          // Only add tera weight if this provides unique coverage
          const baseCount = Math.floor(teamCoverage.offensive.coverage[type]);
          if (baseCount === 0 || (baseCount === 1 && coverage.offensive.superEffective.includes(type))) {
            teamCoverage.offensive.coverage[type] += TERA_WEIGHT;
          }
        }
      }
      
      // Count defensive weaknesses
      for (const type of coverage.defensive.weakTo) {
        teamCoverage.defensive.weaknesses[type]++;
      }
      
      // Add tera defensive changes with reduced weight
      if (pokemon.teraType && coverage.defensive.teraWeakTo) {
        // Reduce weakness count if tera removes a weakness
        for (const type of allTypes) {
          const isWeakNormally = coverage.defensive.weakTo.includes(type);
          const isWeakWhenTera = coverage.defensive.teraWeakTo.includes(type);
          
          if (isWeakNormally && !isWeakWhenTera) {
            // Tera removes this weakness
            teamCoverage.defensive.weaknesses[type] -= TERA_WEIGHT;
          } else if (!isWeakNormally && isWeakWhenTera) {
            // Tera adds this weakness
            teamCoverage.defensive.weaknesses[type] += TERA_WEIGHT;
          }
        }
      }
      
      // Count resistances
      for (const type of coverage.defensive.resistances) {
        teamCoverage.defensive.resistances[type]++;
      }
      for (const type of coverage.defensive.immunities) {
        teamCoverage.defensive.resistances[type]++;
      }
      
      // Add tera resistance changes
      if (pokemon.teraType && coverage.defensive.teraResistances) {
        for (const type of coverage.defensive.teraResistances) {
          if (!coverage.defensive.resistances.includes(type) && !coverage.defensive.immunities.includes(type)) {
            teamCoverage.defensive.resistances[type] += TERA_WEIGHT;
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing ${pokemon.species}:`, error);
    }
  }

  // Find uncovered types (considering tera contributions)
  teamCoverage.offensive.uncovered = allTypes.filter(
    type => teamCoverage.offensive.coverage[type] < 0.5
  );

  teamCoverage.defensive.commonWeaknesses = allTypes.filter(
    type => teamCoverage.defensive.weaknesses[type] >= 2.75
  );

  return teamCoverage;
}
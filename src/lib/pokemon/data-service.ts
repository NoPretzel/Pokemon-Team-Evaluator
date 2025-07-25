import { Dex } from '@pkmn/sim';
import { StatsTable, Pokemon as CalcPokemon, Generations } from '@smogon/calc';
import { toID } from '@smogon/calc/dist/util';

export const dex = Dex;

export function getPokemonData(speciesName: string) {
  const species = dex.species.get(speciesName);
  if (!species || !species.exists) return null;
  
  return {
    name: species.name,
    types: species.types,
    baseStats: species.baseStats,
    abilities: Object.values(species.abilities).filter(Boolean),
    tier: species.tier || 'Untiered',
  };
}

export function getMoveData(moveName: string) {
  const move = dex.moves.get(moveName);
  if (!move || !move.exists) return null;
  
  return {
    name: move.name,
    type: move.type,
    category: move.category,
    basePower: move.basePower,
    accuracy: move.accuracy === true ? 100 : move.accuracy,
    priority: move.priority,
  };
}

export function getItemData(itemName: string) {
  const item = dex.items.get(itemName);
  if (!item || !item.exists) return null;
  
  return {
    name: item.name,
    desc: item.desc || item.shortDesc || '',
  };
}

export function getAbilityData(abilityName: string) {
  const ability = dex.abilities.get(abilityName);
  if (!ability || !ability.exists) return null;
  
  return {
    name: ability.name,
    desc: ability.desc || ability.shortDesc || '',
  };
}

export function getTypeEffectiveness(attackingType: string, defendingTypes: string[]): number {
  return dex.getEffectiveness(attackingType, defendingTypes);
}

// Get all Pokemon in a specific tier
export function getPokemonByTier(tier: string): string[] {
  const pokemonInTier: string[] = [];
  
  for (const species of dex.species.all()) {
    if (species.exists && species.tier === tier) {
      pokemonInTier.push(species.name);
    }
  }
  
  return pokemonInTier;
}

export function calculateStats(
  speciesName: string,
  level: number,
  evs: Partial<StatsTable>,
  ivs: Partial<StatsTable>,
  nature: string
): StatsTable | null {
  try {
    // Get the Generation 9 object
    const gen = Generations.get(9);
    
    // Create a Pokemon instance with the given parameters
    const pokemon = new CalcPokemon(gen, speciesName, {
      level,
      nature,
      evs: evs as StatsTable,
      ivs: ivs as StatsTable,
    });
    
    // Return the calculated stats
    return pokemon.stats;
  } catch (error) {
    console.error('Error calculating stats:', error);
    return null;
  }
}

// Helper to get complete stat spread with defaults
export function getDefaultStats(): StatsTable {
  return {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  };
}

// Helper to get max EVs spread (252/252/4)
export function getMaxEVSpread(stat1: keyof StatsTable, stat2: keyof StatsTable, stat3: keyof StatsTable): StatsTable {
  const evs = getDefaultStats();
  evs[stat1] = 252;
  evs[stat2] = 252;
  evs[stat3] = 4;
  return evs;
}

// Helper to get perfect IVs
export function getPerfectIVs(): StatsTable {
  return {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };
}

// Helper to get type matchups for a specific type
export function getTypeMatchups(typeName: string) {
  const typeData = dex.types.get(typeName);
  if (!typeData || !typeData.exists) return null;

  return {
    damageTaken: typeData.damageTaken,
    HPivs: typeData.HPivs,
    HPdvs: typeData.HPdvs,
  };
}
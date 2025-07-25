import { Sets } from '@pkmn/sets';
import { Team, Pokemon } from '@/types';
import { StatsTable } from '@smogon/calc';

export function parseShowdownTeam(importString: string): Team {
  try {
    const sets = Sets.importSet(importString);
    
    // If it's a single Pokemon, wrap it in an array
    const pokemonSets = Array.isArray(sets) ? sets : [sets];
    
    const pokemon: Pokemon[] = pokemonSets.map(set => {
      const evs: Partial<StatsTable> = {};
      const ivs: Partial<StatsTable> = {};
      
      if (set.evs) {
        if ('hp' in set.evs) evs.hp = set.evs.hp;
        if ('atk' in set.evs) evs.atk = set.evs.atk;
        if ('def' in set.evs) evs.def = set.evs.def;
        if ('spa' in set.evs) evs.spa = set.evs.spa;
        if ('spd' in set.evs) evs.spd = set.evs.spd;
        if ('spe' in set.evs) evs.spe = set.evs.spe;
      }
      
      if (set.ivs) {
        if ('hp' in set.ivs) ivs.hp = set.ivs.hp;
        if ('atk' in set.ivs) ivs.atk = set.ivs.atk;
        if ('def' in set.ivs) ivs.def = set.ivs.def;
        if ('spa' in set.ivs) ivs.spa = set.ivs.spa;
        if ('spd' in set.ivs) ivs.spd = set.ivs.spd;
        if ('spe' in set.ivs) ivs.spe = set.ivs.spe;
      }
      
      return {
        species: set.species,
        ability: set.ability || '',
        item: set.item || '',
        nature: set.nature || 'Hardy',
        evs,
        ivs,
        moves: set.moves || [],
        teraType: set.teraType,
        level: set.level,
      };
    });
    
    return {
      format: 'gen9ou', // Make dynamic later
      pokemon,
    };
  } catch (error) {
    console.error('Error parsing team:', error);
    // Return empty team if parsing fails
    return {
      format: 'gen9ou',
      pokemon: [],
    };
  }
}

export function exportShowdownTeam(team: Team): string {
  try {
    const sets = team.pokemon.map(pokemon => {
      // Convert our format back to @pkmn/sets format
      const set: any = {
        species: pokemon.species,
        ability: pokemon.ability,
        item: pokemon.item,
        nature: pokemon.nature,
        moves: pokemon.moves,
        evs: {},
        ivs: {},
      };
      
      // Add EVs if they exist
      if (pokemon.evs.hp) set.evs.hp = pokemon.evs.hp;
      if (pokemon.evs.atk) set.evs.atk = pokemon.evs.atk;
      if (pokemon.evs.def) set.evs.def = pokemon.evs.def;
      if (pokemon.evs.spa) set.evs.spa = pokemon.evs.spa;
      if (pokemon.evs.spd) set.evs.spd = pokemon.evs.spd;
      if (pokemon.evs.spe) set.evs.spe = pokemon.evs.spe;
      
      // Add IVs if they're not perfect (31)
      if (pokemon.ivs.hp !== undefined && pokemon.ivs.hp !== 31) set.ivs.hp = pokemon.ivs.hp;
      if (pokemon.ivs.atk !== undefined && pokemon.ivs.atk !== 31) set.ivs.atk = pokemon.ivs.atk;
      if (pokemon.ivs.def !== undefined && pokemon.ivs.def !== 31) set.ivs.def = pokemon.ivs.def;
      if (pokemon.ivs.spa !== undefined && pokemon.ivs.spa !== 31) set.ivs.spa = pokemon.ivs.spa;
      if (pokemon.ivs.spd !== undefined && pokemon.ivs.spd !== 31) set.ivs.spd = pokemon.ivs.spd;
      if (pokemon.ivs.spe !== undefined && pokemon.ivs.spe !== 31) set.ivs.spe = pokemon.ivs.spe;
      
      if (pokemon.teraType) set.teraType = pokemon.teraType;
      if (pokemon.level && pokemon.level !== 100) set.level = pokemon.level;
      
      return set;
    });
    
    // Export all sets
    return sets.map(set => Sets.exportSet(set)).join('\n\n');
  } catch (error) {
    console.error('Error exporting team:', error);
    return '';
  }
}

export function parseFullTeam(importString: string): Team {
  try {
    // Split by double newlines to separate Pokemon
    const pokemonStrings = importString.split(/\n\s*\n/);
    const pokemon: Pokemon[] = [];
    
    for (const pokemonString of pokemonStrings) {
      if (pokemonString.trim()) {
        const parsed = parseShowdownTeam(pokemonString);
        if (parsed.pokemon.length > 0) {
          pokemon.push(...parsed.pokemon);
        }
      }
    }
    
    return {
      format: 'gen9ou',
      pokemon: pokemon.slice(0, 6),
    };
  } catch (error) {
    console.error('Error parsing full team:', error);
    return {
      format: 'gen9ou',
      pokemon: [],
    };
  }
}

// Validate team size
export function validateTeamSize(team: Team): boolean {
  return team.pokemon.length >= 1 && team.pokemon.length <= 6;
}

// Get team format from the first Pokemon's tier
export function detectFormat(team: Team): string {
  // For now, default to OU
  return 'gen9ou';
}
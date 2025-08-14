import { Team, Pokemon } from '@/types';
import { TeamAnalysis, TeamArchetype, PokemonRole, Role, HazardControl } from '@/types/analysis';
import { StatsTable } from '@smogon/calc';
import { MOVE_CATEGORIES } from './move-categories';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';

const gens = new Generations(Dex);
const gen = gens.get(9);

const PURE_STALL_POKEMON = new Set([
  'blissey', 'chansey', 'toxapex', 'clodsire', 'dondozo'
]);

const HEAVY_DEFENSIVE_POKEMON = new Set([
  'corviknight', 'skarmory', 'gliscor', 'slowking-galar',
  'moltres-galar', 'alomomola', 'quagsire', 'gastrodon'
]);

const MODERATE_DEFENSIVE_POKEMON = new Set([
  'ting-lu', 'zamazenta', 'moltres', 'garganacl', 'pecharunt',
  'iron treads', 'hippowdon', 'ferrothorn', 'amoonguss',
  'landorus-therian', 'heatran', 'hydrapple', 'tinkaton',
  'great tusk', 'clefable', 'hatterene'
]);

const OFFENSIVE_POKEMON = new Set([
  'darkrai', 'deoxys-speed', 'pheromosa', 'kartana', 'iron moth',
  'iron valiant', 'flutter mane', 'chi-yu', 'chien-pao',
  'roaring moon', 'iron bundle', 'walking wake', 'raging bolt',
  'gouging fire', 'iron boulder', 'kingambit', 'gholdengo',
  'dragapult', 'ogerpon-wellspring', 'dragonite', 'weavile',
  'ogerpon', 'heatran', 'primarina'
]);

// Key moves
const SCREEN_MOVES = ['reflect', 'light screen', 'aurora veil'];
const SETUP_MOVES = [
  'swords dance', 'nasty plot', 'dragon dance', 'calm mind',
  'bulk up', 'quiver dance', 'shell smash', 'agility',
  'rock polish', 'shift gear', 'iron defense', 'curse'
];
const RECOVERY_MOVES = [
  'recover', 'roost', 'slack off', 'soft-boiled', 'synthesis',
  'moonlight', 'morning sun', 'rest'
];

function getBaseStats(species: string): StatsTable {
  const pokemon = gen.species.get(species);
  
  if (pokemon && pokemon.exists) {
    return {
      hp: pokemon.baseStats.hp,
      atk: pokemon.baseStats.atk,
      def: pokemon.baseStats.def,
      spa: pokemon.baseStats.spa,
      spd: pokemon.baseStats.spd,
      spe: pokemon.baseStats.spe
    };
  }
  
  return { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 };
}

function getNatureMultiplier(nature: string, stat: string): number {
  const natureData = gen.natures.get(nature);
  if (!natureData || !natureData.exists) return 1;
  
  if (natureData.plus === stat) return 1.1;
  if (natureData.minus === stat) return 0.9;
  return 1;
}

function calculateStats(pokemon: Pokemon): StatsTable {
  const level = 100;
  const baseStats = getBaseStats(pokemon.species);
  const ivs = {
    hp: pokemon.ivs?.hp ?? 31,
    atk: pokemon.ivs?.atk ?? 31,
    def: pokemon.ivs?.def ?? 31,
    spa: pokemon.ivs?.spa ?? 31,
    spd: pokemon.ivs?.spd ?? 31,
    spe: pokemon.ivs?.spe ?? 31
  };
  
  return {
    hp: Math.floor(((2 * baseStats.hp + ivs.hp + (pokemon.evs.hp / 4)) * level / 100) + level + 10),
    atk: Math.floor(((2 * baseStats.atk + ivs.atk + (pokemon.evs.atk / 4)) * level / 100 + 5) * getNatureMultiplier(pokemon.nature, 'atk')),
    def: Math.floor(((2 * baseStats.def + ivs.def + (pokemon.evs.def / 4)) * level / 100 + 5) * getNatureMultiplier(pokemon.nature, 'def')),
    spa: Math.floor(((2 * baseStats.spa + ivs.spa + (pokemon.evs.spa / 4)) * level / 100 + 5) * getNatureMultiplier(pokemon.nature, 'spa')),
    spd: Math.floor(((2 * baseStats.spd + ivs.spd + (pokemon.evs.spd / 4)) * level / 100 + 5) * getNatureMultiplier(pokemon.nature, 'spd')),
    spe: Math.floor(((2 * baseStats.spe + ivs.spe + (pokemon.evs.spe / 4)) * level / 100 + 5) * getNatureMultiplier(pokemon.nature, 'spe'))
  };
}

function analyzeRoles(pokemon: Pokemon): Role[] {
  const roles: Role[] = [];
  const stats = calculateStats(pokemon);
  const moves = pokemon.moves.map(m => m.toLowerCase());
  const item = pokemon.item?.toLowerCase() || '';
  
  const offensiveEVs = pokemon.evs.atk + pokemon.evs.spa;
  const defensiveEVs = pokemon.evs.hp + pokemon.evs.def + pokemon.evs.spd;
  const hasSetup = moves.some(m => SETUP_MOVES.includes(m));
  const hasChoiceItem = ['choice band', 'choice specs', 'choice scarf'].includes(item);
  
  // Offensive roles
  if (pokemon.evs.atk >= 200 || stats.atk > stats.spa * 1.2) {
    if (hasSetup) roles.push('Setup Sweeper');
    if (pokemon.evs.spe >= 200 || hasChoiceItem) roles.push('Physical Sweeper');
    else if (offensiveEVs >= 200) roles.push('Wallbreaker');
  }
  
  if (pokemon.evs.spa >= 200 || stats.spa > stats.atk * 1.2) {
    if (hasSetup) roles.push('Setup Sweeper');
    if (pokemon.evs.spe >= 200 || hasChoiceItem) roles.push('Special Sweeper');
    else if (offensiveEVs >= 200) roles.push('Wallbreaker');
  }
  
  // Defensive roles
  if (defensiveEVs >= 300 && !hasChoiceItem && offensiveEVs < 300) {
    if (pokemon.evs.def >= 200) roles.push('Physical Wall');
    if (pokemon.evs.spd >= 200) roles.push('Special Wall');
    if (defensiveEVs >= 400) roles.push('Mixed Wall');
  }
  
  // Special cases
  if (moves.includes('iron defense') && moves.includes('body press')) {
    roles.push('Setup Sweeper');
  }
  
  // Utility roles
  if (moves.some(m => MOVE_CATEGORIES.pivot.includes(m))) roles.push('Pivot');
  if (moves.some(m => MOVE_CATEGORIES.priority.includes(m)) && offensiveEVs >= 200) roles.push('Revenge Killer');
  if (moves.some(m => MOVE_CATEGORIES.hazards.includes(m))) roles.push('Hazard Setter');
  if (moves.some(m => MOVE_CATEGORIES.hazardRemoval.includes(m))) roles.push('Hazard Remover');
  if (moves.some(m => MOVE_CATEGORIES.cleric.includes(m))) roles.push('Cleric');
  if (moves.some(m => MOVE_CATEGORIES.status.includes(m)) && offensiveEVs < 200) roles.push('Support');
  
  return [...new Set(roles)];
}

function analyzeHazardControl(team: Team): HazardControl {
  const hazardSetters: string[] = [];
  const hazardRemovers: string[] = [];
  
  team.pokemon.forEach(mon => {
    const moves = mon.moves.map(m => m.toLowerCase());
    
    if (moves.some(m => MOVE_CATEGORIES.hazards.includes(m))) {
      hazardSetters.push(mon.species);
    }
    
    if (moves.some(m => MOVE_CATEGORIES.hazardRemoval.includes(m))) {
      hazardRemovers.push(mon.species);
    }
  });
  
  return {
    hasHazards: hazardSetters.length > 0,
    hasHazardRemoval: hazardRemovers.length > 0,
    hazardSetters,
    hazardRemovers
  };
}

function determineArchetype(team: Team, teamRoles: PokemonRole[], format?: string): TeamArchetype {
  let pureStallCount = 0;
  let heavyDefensiveCount = 0;
  let moderateDefensiveCount = 0;
  let offensivePokemonCount = 0;
  let setupSweepers = 0;
  let hasScreens = false;
  let hasWeather = false;
  let hasTrickRoom = false;
  let recoveryWalls = 0;
  let offensiveItems = 0;
  let defensiveItems = 0;
  let choiceItems = 0;
  
  team.pokemon.forEach((mon, idx) => {
    const species = mon.species.toLowerCase();
    const moves = mon.moves.map(m => m.toLowerCase());
    const ability = mon.ability?.toLowerCase() || '';
    const item = mon.item?.toLowerCase() || '';
    const roles = teamRoles[idx].roles;
    const evs = mon.evs;
    
    // Count Pokemon types
    if (PURE_STALL_POKEMON.has(species)) pureStallCount++;
    else if (HEAVY_DEFENSIVE_POKEMON.has(species)) heavyDefensiveCount++;
    else if (MODERATE_DEFENSIVE_POKEMON.has(species)) moderateDefensiveCount++;
    if (OFFENSIVE_POKEMON.has(species)) offensivePokemonCount++;
    
    // Count roles
    if (roles.includes('Setup Sweeper')) setupSweepers++;
    
    // Check for specific strategies
    if (moves.some(m => SCREEN_MOVES.includes(m))) hasScreens = true;
    if (['drought', 'drizzle', 'sand stream', 'snow warning'].includes(ability)) hasWeather = true;
    if (moves.includes('trick room')) hasTrickRoom = true;
    
    // Check for recovery walls
    const hasRecovery = moves.some(m => RECOVERY_MOVES.includes(m));
    const defensiveEVs = evs.hp + evs.def + evs.spd;
    if (hasRecovery && defensiveEVs >= 400) recoveryWalls++;
    
    // Count items
    if (['choice band', 'choice specs', 'choice scarf'].includes(item)) {
      choiceItems++;
      offensiveItems++;
    } else if (['life orb', 'booster energy', 'weakness policy'].includes(item)) {
      offensiveItems++;
    } else if (['leftovers', 'black sludge', 'rocky helmet', 'assault vest', 'heavy-duty boots'].includes(item)) {
      defensiveItems++;
    }
  });
  
  const totalDefensivePresence = pureStallCount + heavyDefensiveCount + (moderateDefensiveCount * 0.5);
  
  // Count defensive pivots and offensive threats for later use
  let defensivePivots = 0;
  let offensiveThreats = 0;
  
  team.pokemon.forEach((mon, idx) => {
    const evs = mon.evs;
    const defensiveEVs = evs.hp + evs.def + evs.spd;
    const offensiveEVs = evs.atk + evs.spa;
    const species = mon.species.toLowerCase();
    const roles = teamRoles[idx].roles;
    const item = mon.item?.toLowerCase() || '';
    
    if ((defensiveEVs >= 400 || (MODERATE_DEFENSIVE_POKEMON.has(species) && defensiveEVs >= 300)) ||
        ['assault vest', 'rocky helmet'].includes(item)) {
      defensivePivots++;
    }
    
    if (offensiveEVs >= 400 || (OFFENSIVE_POKEMON.has(species) && offensiveEVs >= 300) || 
        roles.includes('Setup Sweeper') || roles.includes('Wallbreaker') ||
        ['choice band', 'choice specs', 'choice scarf', 'life orb'].includes(item)) {
      offensiveThreats++;
    }
  });
  
  // STALL: 3+ pure stall or very heavy defensive
  if (pureStallCount >= 3) return 'Stall';
  if (pureStallCount >= 2 && heavyDefensiveCount >= 1) return 'Stall';
  
  // SEMI-STALL: Very heavy defensive with minimal offense
  if (pureStallCount >= 2 && setupSweepers === 0) return 'Semi-Stall';
  if (pureStallCount >= 1 && heavyDefensiveCount >= 2 && offensiveItems <= 1) return 'Semi-Stall';
  if (totalDefensivePresence >= 4.5 && setupSweepers <= 1 && offensiveItems <= 1) return 'Semi-Stall';
  
  // HYPER OFFENSE: Screens or extreme offense with no bulk
  if (hasScreens && setupSweepers >= 2 && totalDefensivePresence < 1) return 'Hyper Offense';
  if (setupSweepers >= 4 && totalDefensivePresence < 1) return 'Hyper Offense';
  if (offensiveItems >= 5 && defensiveItems <= 1) return 'Hyper Offense';
  
  // OFFENSE: Clear offensive focus with minimal defense
  if (hasScreens && setupSweepers >= 1) return 'Offense';
  if (hasWeather && offensiveItems >= 2 && totalDefensivePresence < 2) return 'Offense';
  if (hasTrickRoom && setupSweepers >= 1) return 'Offense';
  if (setupSweepers >= 2 && totalDefensivePresence < 1.5 && defensivePivots <= 1) return 'Offense';
  if (choiceItems >= 3 && totalDefensivePresence < 2) return 'Offense';
  if (offensiveItems >= 4 && totalDefensivePresence < 2 && defensivePivots <= 1) return 'Offense';
  
  // BULKY OFFENSE: Strong offense with clear defensive backbone
  // Bulky Offense needs significant offense with some defensive support
  if (setupSweepers >= 3) return 'Bulky Offense';
  if (choiceItems >= 2 && defensivePivots >= 2) return 'Bulky Offense';
  if (choiceItems >= 2 && setupSweepers >= 1 && totalDefensivePresence >= 1.5) return 'Bulky Offense';
  if (offensiveThreats >= 4 && defensivePivots >= 1) return 'Bulky Offense';
  if (offensiveThreats >= 3 && defensivePivots >= 2 && offensiveItems >= 3) return 'Bulky Offense';
  if (setupSweepers >= 2 && defensivePivots >= 2 && offensiveItems >= 2) return 'Bulky Offense';
  if (offensivePokemonCount >= 4 && totalDefensivePresence >= 1) return 'Bulky Offense';
  
  // BALANCE: Well rounded teams with mixed offense and defense
  // Key indicators for Balance
  let pivotMoves = 0;
  let hazardSetters = 0;
  let hazardRemovers = 0;
  let recoveryUsers = 0;
  
  team.pokemon.forEach(mon => {
    const moves = mon.moves.map(m => m.toLowerCase());
    
    if (moves.some(m => ['u-turn', 'volt switch', 'flip turn', 'parting shot', 'chilly reception', 'teleport'].includes(m))) {
      pivotMoves++;
    }
    if (moves.some(m => MOVE_CATEGORIES.hazards.includes(m))) {
      hazardSetters++;
    }
    if (moves.some(m => MOVE_CATEGORIES.hazardRemoval.includes(m))) {
      hazardRemovers++;
    }
    if (moves.some(m => RECOVERY_MOVES.includes(m))) {
      recoveryUsers++;
    }
  });
  
  // Balance characteristics
  if (pivotMoves >= 2 && totalDefensivePresence >= 2) {
    return 'Balance';
  }
  
  if (hazardSetters >= 1 && hazardRemovers >= 1 && setupSweepers <= 2) {
    return 'Balance';
  }
  
  if (totalDefensivePresence >= 2 && totalDefensivePresence <= 3.5 &&
      offensiveThreats <= 3 && recoveryUsers >= 2) {
    return 'Balance';
  }
  
  // Default to Balance for mixed teams
  return 'Balance';
}

export function analyzeTeam(team: Team, format?: string): TeamAnalysis {
  const teamRoles: PokemonRole[] = team.pokemon.map(mon => ({
    pokemon: mon.species,
    roles: analyzeRoles(mon),
    stats: calculateStats(mon)
  }));
  
  const archetype = determineArchetype(team, teamRoles, format);
  
  // Calculate display scores
  let offensiveScore = 0;
  let defensiveScore = 0;
  let speedScore = 0;
  
  team.pokemon.forEach((mon, idx) => {
    const stats = teamRoles[idx].stats;
    const attackingStat = Math.max(stats.atk, stats.spa);
    const defensiveStat = (stats.hp + stats.def + stats.spd) / 3;
    
    offensiveScore += (attackingStat / 150) * 100 / 6;
    defensiveScore += (defensiveStat / 110) * 100 / 6;
    speedScore += (stats.spe / 120) * 100 / 6;
  });
  
  // Normalize scores
  offensiveScore = Math.min(100, Math.max(0, offensiveScore));
  defensiveScore = Math.min(100, Math.max(0, defensiveScore));
  speedScore = Math.min(100, Math.max(0, speedScore));
  
  const hazardControl = analyzeHazardControl(team);
  
  return {
    archetype,
    offensiveScore,
    defensiveScore,
    speedScore,
    hazardControl,
    teamRoles
  };
}
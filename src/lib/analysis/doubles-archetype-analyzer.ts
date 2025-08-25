import { Team, Pokemon } from '@/types';
import { TeamAnalysis, TeamArchetype, PokemonRole, HazardControl } from '@/types/analysis';
import { FORMATS } from '@/lib/pokemon/formats';

// Doubles-specific archetypes
const DOUBLES_SUPPORT_POKEMON = new Set([
  'incineroar', 'rillaboom', 'amoonguss', 'indeedee-f', 'indeedee-m',
  'grimmsnarl', 'whimsicott', 'togekiss', 'clefairy', 'porygon2'
]);

const DOUBLES_REDIRECTORS = new Set([
  'amoonguss', 'indeedee-f', 'indeedee-m', 'clefairy', 'togekiss'
]);

const DOUBLES_INTIMIDATORS = new Set([
  'incineroar', 'landorus-therian', 'arcanine', 'hitmontop', 'scrafty'
]);

const DOUBLES_WEATHER_SETTERS = new Set([
  'torkoal', 'pelipper', 'tyranitar', 'abomasnow', 'hippowdon',
  'ninetales', 'ninetales-alola', 'politoed', 'gigalith'
]);

const DOUBLES_SPEED_CONTROL_MOVES = [
  'trick room', 'tailwind', 'icy wind', 'electroweb', 'scary face',
  'string shot', 'sticky web', 'bulldoze', 'rock tomb'
];

const DOUBLES_PROTECT_MOVES = [
  'protect', 'detect', 'wide guard', 'quick guard', 'mat block',
  'kings shield', 'spiky shield', 'baneful bunker', 'obstruct'
];

const DOUBLES_SPREAD_MOVES = [
  'earthquake', 'surf', 'discharge', 'blizzard', 'heat wave',
  'rock slide', 'dazzling gleam', 'sludge wave', 'hyper voice',
  'muddy water', 'eruption', 'water spout', 'glaciate', 'bulldoze',
  'electroweb', 'icy wind', 'struggle bug', 'snarl'
];

const DOUBLES_REDIRECTION_MOVES = [
  'follow me', 'rage powder', 'ally switch', 'spotlight'
];

const DOUBLES_SUPPORT_MOVES = [
  'fake out', 'helping hand', 'ally switch', 'heal pulse',
  'life dew', 'coaching', 'decorate', 'aurora veil', 'reflect',
  'light screen', 'safeguard', 'wide guard', 'quick guard'
];

function analyzeDoublesRoles(pokemon: Pokemon): string[] {
  const roles: string[] = [];
  const moves = pokemon.moves.map(m => m.toLowerCase());
  const ability = pokemon.ability?.toLowerCase() || '';
  const species = pokemon.species.toLowerCase();
  
  // Speed Control
  if (moves.some(m => DOUBLES_SPEED_CONTROL_MOVES.includes(m))) {
    roles.push('Speed Control');
  }
  
  // Redirector
  if (moves.some(m => DOUBLES_REDIRECTION_MOVES.includes(m)) || 
      DOUBLES_REDIRECTORS.has(species)) {
    roles.push('Redirector');
  }
  
  // Support
  if (moves.some(m => DOUBLES_SUPPORT_MOVES.includes(m)) ||
      DOUBLES_SUPPORT_POKEMON.has(species)) {
    roles.push('Support');
  }
  
  // Intimidate Support
  if (ability === 'intimidate' || DOUBLES_INTIMIDATORS.has(species)) {
    roles.push('Intimidate');
  }
  
  // Weather Setter
  if (DOUBLES_WEATHER_SETTERS.has(species) ||
      ['drought', 'drizzle', 'sand stream', 'snow warning'].includes(ability)) {
    roles.push('Weather Setter');
  }
  
  // Fake Out User
  if (moves.includes('fake out')) {
    roles.push('Fake Out');
  }
  
  // Spread Attacker
  const spreadMoveCount = moves.filter(m => DOUBLES_SPREAD_MOVES.includes(m)).length;
  if (spreadMoveCount >= 2) {
    roles.push('Spread Attacker');
  }
  
  // Protect User
  if (moves.some(m => DOUBLES_PROTECT_MOVES.includes(m))) {
    roles.push('Protect User');
  }
  
  return roles;
}

function determineDoublesArchetype(team: Team): TeamArchetype {
  let trickRoomUsers = 0;
  let tailwindUsers = 0;
  let weatherSetters = 0;
  let supportPokemon = 0;
  let fakeOutUsers = 0;
  let redirectors = 0;
  let intimidators = 0;
  let setupSweepers = 0;
  let averageSpeed = 0;
  
  team.pokemon.forEach(mon => {
    const moves = mon.moves.map(m => m.toLowerCase());
    const ability = mon.ability?.toLowerCase() || '';
    const species = mon.species.toLowerCase();
    const roles = analyzeDoublesRoles(mon);
    
    // Count roles
    if (moves.includes('trick room')) trickRoomUsers++;
    if (moves.includes('tailwind')) tailwindUsers++;
    if (roles.includes('Weather Setter')) weatherSetters++;
    if (roles.includes('Support')) supportPokemon++;
    if (roles.includes('Fake Out')) fakeOutUsers++;
    if (roles.includes('Redirector')) redirectors++;
    if (roles.includes('Intimidate')) intimidators++;
    
    // Check for setup moves
    const setupMoves = ['swords dance', 'nasty plot', 'dragon dance', 'calm mind', 'bulk up'];
    if (moves.some(m => setupMoves.includes(m))) setupSweepers++;
    
    // Calculate average speed (simplified)
    const baseSpeed = 80; // Default assumption
    averageSpeed += baseSpeed;
  });
  
  averageSpeed /= team.pokemon.length;
  
  // Determine archetype based on team composition
  
  // Trick Room
  if (trickRoomUsers >= 1 && averageSpeed < 70) {
    return 'Trick Room';
  }
  
  // Sun/Rain/Sand/Hail teams
  if (weatherSetters >= 1) {
    const weatherAbilities = team.pokemon.filter(p => 
      ['drought', 'drizzle', 'sand stream', 'snow warning'].includes(p.ability?.toLowerCase() || '')
    );
    if (weatherAbilities.length > 0) {
      return 'Weather';
    }
  }
  
  // Hyper Offense - multiple setup sweepers or high speed
  if (setupSweepers >= 2 && averageSpeed > 90) {
    return 'Hyper Offense';
  }
  
  // Tailwind
  if (tailwindUsers >= 1 && averageSpeed > 85) {
    return 'Tailwind';
  }
  
  // Hard Trick Room (dedicated TR team)
  if (trickRoomUsers >= 2 || (trickRoomUsers >= 1 && redirectors >= 1)) {
    return 'Hard Trick Room';
  }
  
  // Balance - mix of offense and support
  if (supportPokemon >= 2 && (intimidators >= 1 || redirectors >= 1)) {
    return 'Balance';
  }
  
  // Default to Goodstuff for teams that don't fit clear archetypes
  return 'Goodstuff';
}

export function analyzeDoublesTeam(team: Team, format: string): TeamAnalysis {
  const archetype = determineDoublesArchetype(team);
  
  // For doubles, hazards are much less important
  const hazardControl: HazardControl = {
    hasHazards: false,
    hasHazardRemoval: false,
    hazardSetters: [],
    hazardRemovers: []
  };
  
  // Calculate display scores differently for doubles
  let offensiveScore = 0;
  let defensiveScore = 0;
  let speedScore = 0;
  
  team.pokemon.forEach(mon => {
    const moves = mon.moves.map(m => m.toLowerCase());
    
    // Offensive score based on spread moves and attack stats
    const spreadMoves = moves.filter(m => DOUBLES_SPREAD_MOVES.includes(m)).length;
    offensiveScore += spreadMoves * 25;
    
    // Defensive score based on support moves and abilities
    const supportMoves = moves.filter(m => DOUBLES_SUPPORT_MOVES.includes(m)).length;
    const hasIntimidate = mon.ability?.toLowerCase() === 'intimidate';
    defensiveScore += supportMoves * 20 + (hasIntimidate ? 30 : 0);
    
    // Speed score based on speed control
    const speedControlMoves = moves.filter(m => DOUBLES_SPEED_CONTROL_MOVES.includes(m)).length;
    speedScore += speedControlMoves * 30;
  });
  
  // Normalize scores
  offensiveScore = Math.min(100, offensiveScore);
  defensiveScore = Math.min(100, defensiveScore);
  speedScore = Math.min(100, speedScore);
  
  const teamRoles = team.pokemon.map(mon => ({
    pokemon: mon.species,
    roles: analyzeDoublesRoles(mon),
    stats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 } // Simplified
  }));
  
  return {
    archetype,
    offensiveScore,
    defensiveScore,
    speedScore,
    hazardControl,
    teamRoles
  };
}
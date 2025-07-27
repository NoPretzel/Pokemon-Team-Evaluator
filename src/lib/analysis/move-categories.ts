import { MoveCategory } from '@/types/analysis';

export const MOVE_CATEGORIES: MoveCategory = {
  hazards: [
    'Stealth Rock',
    'Spikes',
    'Toxic Spikes',
    'Sticky Web',
    'Ceaseless Edge',
    'Stone Axe',
    'G-Max Steelsurge',
  ],
  
  hazardRemoval: [
    'Rapid Spin',
    'Defog',
    'Mortal Spin',
    'Tidy Up',
    'Court Change',
  ],
  
  recovery: [
    'Recover',
    'Roost',
    'Synthesis',
    'Moonlight',
    'Morning Sun',
    'Slack Off',
    'Soft-Boiled',
    'Heal Order',
    'Milk Drink',
    'Shore Up',
    'Strength Sap',
    'Leech Life',
    'Drain Punch',
    'Giga Drain',
    'Horn Leech',
    'Draining Kiss',
    'Oblivion Wing',
    'Parabolic Charge',
    'Bitter Blade',
    'Matcha Gotcha',
  ],
  
  status: [
    'Thunder Wave',
    'Will-O-Wisp',
    'Toxic',
    'Spore',
    'Sleep Powder',
    'Hypnosis',
    'Lovely Kiss',
    'Sing',
    'Yawn',
    'Dark Void',
    'Stun Spore',
    'Glare',
    'Nuzzle',
  ],
  
  setup: [
    'Swords Dance',
    'Dragon Dance',
    'Quiver Dance',
    'Calm Mind',
    'Bulk Up',
    'Curse',
    'Iron Defense',
    'Nasty Plot',
    'Tail Glow',
    'Shell Smash',
    'Belly Drum',
    'Agility',
    'Rock Polish',
    'Double Team',
    'Minimize',
    'Substitute',
    'Acid Armor',
    'Barrier',
    'Amnesia',
    'Cotton Guard',
    'Cosmic Power',
    'Defend Order',
    'Defense Curl',
    'Harden',
    'Stockpile',
    'Shift Gear',
    'Coil',
    'Victory Dance',
  ],
  
  priority: [
    'Extreme Speed',
    'Fake Out',
    'Quick Attack',
    'Aqua Jet',
    'Bullet Punch',
    'Ice Shard',
    'Shadow Sneak',
    'Sucker Punch',
    'Vacuum Wave',
    'Water Shuriken',
    'Accelerock',
    'First Impression',
    'Mach Punch',
    'Jet Punch',
    'Grassy Glide',
    'Thunderclap',
  ],
  
  pivot: [
    'U-turn',
    'Volt Switch',
    'Flip Turn',
    'Parting Shot',
    'Teleport',
    'Baton Pass',
    'Chilly Reception',
    'Shed Tail',
  ],
  
  cleric: [
    'Aromatherapy',
    'Heal Bell',
    'Refresh',
    'Rest',
    'Lunar Blessing',
  ],
};

// Helper functions
export function isHazard(move: string): boolean {
  return MOVE_CATEGORIES.hazards.includes(move);
}

export function isHazardRemoval(move: string): boolean {
  return MOVE_CATEGORIES.hazardRemoval.includes(move);
}

export function isRecovery(move: string): boolean {
  return MOVE_CATEGORIES.recovery.includes(move);
}

export function isStatusMove(move: string): boolean {
  return MOVE_CATEGORIES.status.includes(move);
}

export function isSetupMove(move: string): boolean {
  return MOVE_CATEGORIES.setup.includes(move);
}

export function isPriorityMove(move: string): boolean {
  return MOVE_CATEGORIES.priority.includes(move);
}

export function isPivotMove(move: string): boolean {
  return MOVE_CATEGORIES.pivot.includes(move);
}

export function isClericMove(move: string): boolean {
  return MOVE_CATEGORIES.cleric.includes(move);
}
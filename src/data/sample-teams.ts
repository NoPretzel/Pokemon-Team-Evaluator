import { Team } from '@/types';

export const SAMPLE_TEAMS: Record<string, Team[]> = {
  gen9ou: [
    {
      format: 'gen9ou',
      pokemon: [
        {
          species: 'Great Tusk',
          ability: 'Protosynthesis',
          level: 100,
          item: 'Booster Energy',
          nature: 'Jolly',
          evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: ['Headlong Rush', 'Ice Spinner', 'Knock Off', 'Rapid Spin'],
          teraType: 'Ice',
        },
        {
          species: 'Kingambit',
          ability: 'Supreme Overlord',
          level: 100,
          item: 'Black Glasses',
          nature: 'Adamant',
          evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Swords Dance'],
          teraType: 'Dark',
        },
        {
          species: 'Dragapult',
          ability: 'Infiltrator',
          level: 100,
          item: 'Choice Specs',
          nature: 'Timid',
          evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
          ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: ['Draco Meteor', 'Shadow Ball', 'Flamethrower', 'U-turn'],
          teraType: 'Ghost',
        },
        {
          species: 'Heatran',
          ability: 'Flame Body',
          level: 100,
          item: 'Leftovers',
          nature: 'Calm',
          evs: { hp: 252, atk: 0, def: 0, spa: 4, spd: 252, spe: 0 },
          ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: ['Magma Storm', 'Earth Power', 'Taunt', 'Stealth Rock'],
          teraType: 'Grass',
        },
        {
          species: 'Toxapex',
          ability: 'Regenerator',
          level: 100,
          item: 'Black Sludge',
          nature: 'Bold',
          evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
          ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: ['Surf', 'Recover', 'Haze', 'Toxic Spikes'],
          teraType: 'Steel',
        },
        {
          species: 'Gholdengo',
          ability: 'Good as Gold',
          level: 100,
          item: 'Choice Scarf',
          nature: 'Timid',
          evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
          ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: ['Make It Rain', 'Shadow Ball', 'Trick', 'Recover'],
          teraType: 'Flying',
        },
      ],
    },
  ],
};

export function getSampleTeams(format: string): Team[] {
  return SAMPLE_TEAMS[format] || [];
}
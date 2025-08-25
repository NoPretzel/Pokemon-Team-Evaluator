export const FORMATS = {
  gen9ou: { name: 'OU', generation: 9, gameType: 'singles' },
  gen9ubers: { name: 'Ubers', generation: 9, gameType: 'singles' },
  gen9uu: { name: 'UU', generation: 9, gameType: 'singles' },
  gen9ru: { name: 'RU', generation: 9, gameType: 'singles' },
  gen9nu: { name: 'NU', generation: 9, gameType: 'singles' },
  gen9pu: { name: 'PU', generation: 9, gameType: 'singles' },
  gen9lc: { name: 'LC', generation: 9, gameType: 'singles' },
  gen9doublesou: { name: 'Doubles OU', generation: 9, gameType: 'doubles' },
  gen9doublesubers: { name: 'Doubles Ubers', generation: 9, gameType: 'doubles' },
  gen9doublesuu: { name: 'Doubles UU', generation: 9, gameType: 'doubles' },
} as const;

export type FormatId = keyof typeof FORMATS;
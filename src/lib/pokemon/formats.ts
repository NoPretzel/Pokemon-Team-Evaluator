export const FORMATS = {
  gen9ou: { name: 'OU', generation: 9 },
  gen9uu: { name: 'UU', generation: 9 },
  gen9ru: { name: 'RU', generation: 9 },
  gen9nu: { name: 'NU', generation: 9 },
  gen9pu: { name: 'PU', generation: 9 },
  gen9ubers: { name: 'Ubers', generation: 9 },
  gen9lc: { name: 'LC', generation: 9 },
  gen9monotype: { name: 'Monotype', generation: 9 },
  gen9doublesou: { name: 'Doubles OU', generation: 9 },
  gen9vgc2024: { name: 'VGC 2024', generation: 9 },
} as const;

export type FormatId = keyof typeof FORMATS;
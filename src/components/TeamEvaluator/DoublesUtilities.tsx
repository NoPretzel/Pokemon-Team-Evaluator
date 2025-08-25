import { Card, Text, Badge, Group, Stack, Grid, Box, Paper } from '@mantine/core';
import {
  IconWind,
  IconSnowflake,
  IconSun,
  IconCloudRain,
  IconMountain,
  IconShield,
  IconArrowsExchange,
  IconHandStop,
  IconTarget,
  IconUsers,
  IconSword,
  IconSparkles,
} from '@tabler/icons-react';
import React from 'react';
import { Team } from '@/types';

const DOUBLES_UTILITIES: Record<string, {
  description: string;
  moves?: Record<string, string>;
  abilities?: string[];
  items?: string[];
}> = {
  'Speed Control': {
    description: 'Control turn order',
    moves: {
      'trickroom': 'Trick Room',
      'tailwind': 'Tailwind',
      'icywind': 'Icy Wind',
      'electroweb': 'Electroweb',
      'bulldoze': 'Bulldoze',
      'rocktomb': 'Rock Tomb',
      'scarysace': 'Scary Face',
      'stringshot': 'String Shot',
    },
  },
  'Redirection': {
    description: 'Redirect attacks',
    moves: {
      'followme': 'Follow Me',
      'ragepowder': 'Rage Powder',
      'spotlight': 'Spotlight',
      'allyswitch': 'Ally Switch',
    },
    abilities: ['storm drain', 'lightning rod'],
  },
  'Fake Out': {
    description: 'Flinch priority',
    moves: {
      'fakeout': 'Fake Out',
    },
  },
  'Intimidate': {
    description: 'Lower opponent Attack',
    abilities: ['intimidate'],
  },
  'Weather': {
    description: 'Set weather conditions',
    abilities: ['drought', 'drizzle', 'sand stream', 'snow warning'],
    moves: {
      'sunnyday': 'Sunny Day',
      'raindance': 'Rain Dance',
      'sandstorm': 'Sandstorm',
      'snowscape': 'Snowscape',
    },
  },
  'Protect': {
    description: 'Defensive positioning',
    moves: {
      'protect': 'Protect',
      'detect': 'Detect',
      'wideguard': 'Wide Guard',
      'quickguard': 'Quick Guard',
      'matblock': 'Mat Block',
      'kingsshield': "King's Shield",
      'spikyshield': 'Spiky Shield',
      'banefulbunker': 'Baneful Bunker',
    },
  },
  'Spread Moves': {
    description: 'Hit multiple targets',
    moves: {
      'earthquake': 'Earthquake',
      'surf': 'Surf',
      'heatwave': 'Heat Wave',
      'blizzard': 'Blizzard',
      'discharge': 'Discharge',
      'rockslide': 'Rock Slide',
      'dazzlinggleam': 'Dazzling Gleam',
      'hypervoice': 'Hyper Voice',
      'muddywater': 'Muddy Water',
      'sludgewave': 'Sludge Wave',
    },
  },
  'Support': {
    description: 'Help teammates',
    moves: {
      'helpinghand': 'Helping Hand',
      'coaching': 'Coaching',
      'decorate': 'Decorate',
      'healpulse': 'Heal Pulse',
      'lifedew': 'Life Dew',
      'pollenpuff': 'Pollen Puff',
    },
  },
  'Screens': {
    description: 'Reduce damage taken',
    moves: {
      'reflect': 'Reflect',
      'lightscreen': 'Light Screen',
      'auroraveil': 'Aurora Veil',
    },
    abilities: ['prism armor', 'filter', 'solid rock'],
  },
};

const DOUBLES_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  'Speed Control': { icon: <IconWind size={18} />, color: 'teal' },
  'Redirection': { icon: <IconTarget size={18} />, color: 'red' },
  'Fake Out': { icon: <IconHandStop size={18} />, color: 'orange' },
  'Intimidate': { icon: <IconShield size={18} />, color: 'indigo' },
  'Weather': { icon: <IconSun size={18} />, color: 'yellow' },
  'Protect': { icon: <IconShield size={18} />, color: 'blue' },
  'Spread Moves': { icon: <IconUsers size={18} />, color: 'violet' },
  'Support': { icon: <IconSparkles size={18} />, color: 'pink' },
  'Screens': { icon: <IconShield size={18} />, color: 'cyan' },
};

interface DoublesUtilitiesProps {
  team: Team;
}

interface UtilityCheck {
  category: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  found: boolean;
  providers: { pokemon: string; method: string }[];
}

function toID(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function checkUtility(
  team: Team,
  moves?: Record<string, string>,
  abilities?: string[],
  items?: string[]
): { found: boolean; providers: { pokemon: string; method: string }[] } {
  const providers: { pokemon: string; method: string }[] = [];

  for (const pokemon of team.pokemon) {
    if (!pokemon.species) continue;

    if (moves) {
      for (const move of pokemon.moves) {
        const moveId = toID(move);
        if (moves[moveId]) {
          providers.push({ pokemon: pokemon.species, method: moves[moveId] });
        }
      }
    }
    
    if (abilities && pokemon.ability && abilities.includes(toID(pokemon.ability))) {
      providers.push({ pokemon: pokemon.species, method: pokemon.ability });
    }
    
    if (items && pokemon.item && items.includes(toID(pokemon.item))) {
      providers.push({ pokemon: pokemon.species, method: pokemon.item });
    }
  }

  const unique = providers.filter(
    (p, i, self) => i === self.findIndex((x) => x.pokemon === p.pokemon && x.method === p.method)
  );

  return { found: unique.length > 0, providers: unique };
}

export function DoublesUtilities({ team }: DoublesUtilitiesProps) {
  const activeTeam = team.pokemon.filter((p) => p.species);
  if (activeTeam.length === 0) {
    return (
      <Card shadow='sm' radius='md' withBorder className='top-level-card'>
        <Text c='dimmed' ta='center'>
          Add Pokemon to see doubles utilities analysis
        </Text>
      </Card>
    );
  }

  const utilities: UtilityCheck[] = Object.keys(DOUBLES_ICONS).map((category) => {
    const { icon, color } = DOUBLES_ICONS[category];
    const meta = DOUBLES_UTILITIES[category];
    const { found, providers } = checkUtility(team, meta.moves, meta.abilities, meta.items);
    return {
      category,
      description: meta.description,
      icon,
      color,
      found,
      providers,
    };
  });

  const found = utilities.filter((u) => u.found);
  const missing = utilities.filter((u) => !u.found);
  
  // Doubles teams need at least 3-4 key utilities
  const passed = found.length >= 3;
  const score = Math.round((found.length / utilities.length) * 100);

  return (
    <Card shadow='sm' radius='md' withBorder className='top-level-card'>
      <Stack>
        <Group justify='space-between'>
          <Text fw={600} size='lg'>
            Doubles Utilities
          </Text>
          <Badge size='lg' color={passed ? 'green' : 'red'}>
            {passed ? 'PASS' : 'FAIL'} - {score}%
          </Badge>
        </Group>

        <Grid gutter={32}>
          {/* Found */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap='sm'>
              <Group gap='xs'>
                <Text size='lg' fw={700} c='green.7'>
                  ✓ Available
                </Text>
                <Badge color='green' variant='filled' size='lg'>
                  {found.length}
                </Badge>
              </Group>
              <Box style={{ height: 2, backgroundColor: 'var(--mantine-color-green-6)', marginBottom: 8 }} />

              {found.length > 0 ? (
                <Stack gap='sm'>
                  {found.map((utility) => (
                    <Paper
                      key={utility.category}
                      p='sm'
                      withBorder
                      style={{
                        borderColor: 'var(--mantine-color-green-3)',
                        backgroundColor: 'var(--mantine-color-green-0)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Box
                          style={{
                            color: `var(--mantine-color-${utility.color}-7)`,
                            backgroundColor: `var(--mantine-color-${utility.color}-1)`,
                            borderRadius: 'var(--mantine-radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                          }}
                        >
                          {utility.icon}
                        </Box>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Text size='sm' fw={600}>
                            {utility.category}
                          </Text>
                          <Text size='xs' c='dimmed'>
                            {utility.description}
                          </Text>

                          <Stack gap={4} style={{ marginTop: 8 }}>
                            {utility.providers.map((p, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Box
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--mantine-color-green-6)',
                                  }}
                                />
                                <Text size='xs' style={{ lineHeight: 1.1 }}>
                                  <span style={{ fontWeight: 600 }}>{p.pokemon}</span>
                                  <span style={{ color: 'var(--mantine-color-dimmed)' }}> — {p.method}</span>
                                </Text>
                              </div>
                            ))}
                          </Stack>
                        </div>
                      </div>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text size='sm' c='dimmed' ta='center' py='xl'>
                  No utilities found yet
                </Text>
              )}
            </Stack>
          </Grid.Col>

          {/* Missing */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap='sm'>
              <Group gap='xs'>
                <Text size='lg' fw={700} c='red.7'>
                  ✗ Missing
                </Text>
                <Badge color='red' variant='filled' size='lg'>
                  {missing.length}
                </Badge>
              </Group>
              <Box style={{ height: 2, backgroundColor: 'var(--mantine-color-red-6)', marginBottom: 8 }} />

              {missing.length > 0 ? (
                <Stack gap='sm'>
                  {missing.map((utility) => {
                    const meta = DOUBLES_UTILITIES[utility.category];
                    const suggestions = [];
                    if (meta.moves) suggestions.push(...Object.values(meta.moves).slice(0, 3));
                    if (meta.abilities) suggestions.push(...meta.abilities.slice(0, 2));
                    
                    return (
                      <Paper
                        key={utility.category}
                        p='sm'
                        withBorder
                        style={{
                          borderColor: 'var(--mantine-color-gray-3)',
                          backgroundColor: 'var(--mantine-color-gray-0)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <Box
                            style={{
                              color: `var(--mantine-color-${utility.color}-7)`,
                              backgroundColor: `var(--mantine-color-${utility.color}-1)`,
                              borderRadius: 'var(--mantine-radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 30,
                              height: 30,
                              flexShrink: 0,
                            }}
                          >
                            {utility.icon}
                          </Box>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Text size='sm' fw={600} c='gray.7'>
                              {utility.category}
                            </Text>
                            <Text size='xs' c='dimmed'>
                              {utility.description}
                            </Text>
                            <Text size='xs' c='gray.6' style={{ marginTop: 8 }}>
                              Try: {suggestions.join(' • ')}
                            </Text>
                          </div>
                        </div>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Text size='sm' c='dimmed' ta='center' py='xl'>
                  All utilities covered!
                </Text>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  );
}
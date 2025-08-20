import { Card, Text, Badge, Group, Stack, Grid, Box, Paper } from '@mantine/core';
import {
  IconAlertTriangle,
  IconShield,
  IconBandage,
  IconArrowsExchange,
  IconSword,
  IconBolt,
  IconFlame,
  IconBan,
  IconClock,
} from '@tabler/icons-react';
import React from 'react';
import { Team } from '@/types';

const HAZARD_MOVES: Record<string, string> = {
  'stealthrock': 'Stealth Rock',
  'spikes': 'Spikes',
  'toxicspikes': 'Toxic Spikes',
  'stickyweb': 'Sticky Web',
  'ceaselessedge': 'Ceaseless Edge',
  'stoneaxe': 'Stone Axe',
};

const REMOVAL_MOVES: Record<string, string> = {
  'defog': 'Defog',
  'rapidspin': 'Rapid Spin',
  'courtchange': 'Court Change',
  'tidyup': 'Tidy Up',
  'mortalspin': 'Mortal Spin',
};

const RELIABLE_RECOVERY: Record<string, string> = {
  'roost': 'Roost',
  'recover': 'Recover',
  'slackoff': 'Slack Off',
  'softboiled': 'Soft-Boiled',
  'synthesis': 'Synthesis',
  'morningsun': 'Morning Sun',
  'moonlight': 'Moonlight',
  'milkdrink': 'Milk Drink',
  'shoreup': 'Shore Up',
  'strengthsap': 'Strength Sap',
  'wish': 'Wish',
};

const MOMENTUM_MOVES: Record<string, string> = {
  'uturn': 'U-turn',
  'voltswitch': 'Volt Switch',
  'flipturn': 'Flip Turn',
  'teleport': 'Teleport',
  'partingshot': 'Parting Shot',
  'chillyreception': 'Chilly Reception',
  'shedtail': 'Shed Tail',
};

const SETUP_MOVES: Record<string, string> = {
  'swordsdance': 'Swords Dance',
  'dragondance': 'Dragon Dance',
  'nastyplot': 'Nasty Plot',
  'calmmind': 'Calm Mind',
  'bulkup': 'Bulk Up',
  'coil': 'Coil',
  'quiverdance': 'Quiver Dance',
  'shellsmash': 'Shell Smash',
  'agility': 'Agility',
  'rockpolish': 'Rock Polish',
  'irondefense': 'Iron Defense',
  'amnesia': 'Amnesia',
};

const STATUS_MOVES: Record<string, string> = {
  'thunderwave': 'Thunder Wave',
  'willowisp': 'Will-O-Wisp',
  'toxic': 'Toxic',
  'sleeppowder': 'Sleep Powder',
  'spore': 'Spore',
  'hypnosis': 'Hypnosis',
  'yawn': 'Yawn',
  'glare': 'Glare',
  'stunspore': 'Stun Spore',
  'nuzzle': 'Nuzzle',
};

const PRIORITY_MOVES: Record<string, string> = {
  'extremespeed': 'Extreme Speed',
  'fakeout': 'Fake Out',
  'quickattack': 'Quick Attack',
  'aquajet': 'Aqua Jet',
  'bulletpunch': 'Bullet Punch',
  'machpunch': 'Mach Punch',
  'shadowsneak': 'Shadow Sneak',
  'iceshard': 'Ice Shard',
  'suckerpunch': 'Sucker Punch',
  'vacuumwave': 'Vacuum Wave',
  'accelerock': 'Accelerock',
  'grassyglide': 'Grassy Glide',
};

const DISRUPTION_MOVES: Record<string, string> = {
  'taunt': 'Taunt',
  'encore': 'Encore',
  'disable': 'Disable',
  'knockoff': 'Knock Off',
  'trick': 'Trick',
  'switcheroo': 'Switcheroo',
  'clearsmog': 'Clear Smog',
  'haze': 'Haze',
};

const SPEED_CONTROL: Record<string, string> = {
  'trickroom': 'Trick Room',
  'tailwind': 'Tailwind',
  'icywind': 'Icy Wind',
  'electroweb': 'Electroweb',
  'bulldoze': 'Bulldoze',
  'stickyweb': 'Sticky Web',
};

const UTILITY_META: Record<
  string,
  { description: string; moves: Record<string, string>; abilities?: string[]; items?: string[] }
> = {
  'Entry Hazards': {
    description: 'Chip damage on switch-in',
    moves: HAZARD_MOVES,
  },
  'Hazard Removal': {
    description: 'Clear hazards from your side',
    moves: REMOVAL_MOVES,
    items: ['heavydutyboots'],
  },
  'Reliable Recovery': {
    description: 'HP recovery moves & abilities',
    moves: RELIABLE_RECOVERY,
    abilities: ['regenerator'],
  },
  'Momentum': {
    description: 'Pivot moves for switching',
    moves: MOMENTUM_MOVES,
  },
  'Setup Moves': {
    description: 'Stat boosting moves',
    moves: SETUP_MOVES,
  },
  'Priority Moves': {
    description: 'Moves with increased priority',
    moves: PRIORITY_MOVES,
  },
  'Status Moves': {
    description: 'Inflict burn, paralysis, sleep',
    moves: STATUS_MOVES,
  },
  'Disruption': {
    description: 'Prevent opponent strategies',
    moves: DISRUPTION_MOVES,
  },
  'Speed Control': {
    description: 'Manipulate speed tiers',
    moves: SPEED_CONTROL,
    abilities: ['intimidate'],
  },
};

const UTILITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  'Entry Hazards': { icon: <IconAlertTriangle size={18} />, color: 'indigo' },
  'Hazard Removal': { icon: <IconShield size={18} />, color: 'cyan' },
  'Reliable Recovery': { icon: <IconBandage size={18} />, color: 'pink' },
  'Momentum': { icon: <IconArrowsExchange size={18} />, color: 'teal' },
  'Setup Moves': { icon: <IconSword size={18} />, color: 'red' },
  'Priority Moves': { icon: <IconBolt size={18} />, color: 'yellow' },
  'Status Moves': { icon: <IconFlame size={18} />, color: 'orange' },
  'Disruption': { icon: <IconBan size={18} />, color: 'violet' },
  'Speed Control': { icon: <IconClock size={18} />, color: 'blue' },
};

interface TeamUtilitiesProps {
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
  moves: Record<string, string>,
  abilities?: string[],
  items?: string[]
): { found: boolean; providers: { pokemon: string; method: string }[] } {
  const providers: { pokemon: string; method: string }[] = [];

  for (const pokemon of team.pokemon) {
    if (!pokemon.species) continue;

    for (const move of pokemon.moves) {
      const moveId = toID(move);
      if (moves[moveId]) providers.push({ pokemon: pokemon.species, method: moves[moveId] });
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


export function TeamUtilities({ team }: TeamUtilitiesProps) {
  const activeTeam = team.pokemon.filter((p) => p.species);
  if (activeTeam.length === 0) {
    return (
      <Card shadow='sm' radius='md' withBorder className='top-level-card'>
        <Text c='dimmed' ta='center'>
          Add Pokemon to see team utilities analysis
        </Text>
      </Card>
    );
  }

  const utilities: UtilityCheck[] = Object.keys(UTILITY_ICONS).map((category) => {
    const { icon, color } = UTILITY_ICONS[category];
    const meta = UTILITY_META[category];
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
  const passed = found.length >= 4;
  const score = Math.round((found.length / utilities.length) * 100);

  return (
    <Card shadow='sm' radius='md' withBorder className='top-level-card'>
      <Stack>
        <Group justify='space-between'>
          <Text fw={600} size='lg'>
            Team Utilities
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
                          aria-label={`${utility.category} icon`}
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
                  {missing.map((utility) => (
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
                          aria-label={`${utility.category} icon`}
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
                            {Object.values(UTILITY_META[utility.category].moves).slice(0, 4).join(' • ')}
                          </Text>
                        </div>
                      </div>
                    </Paper>
                  ))}
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

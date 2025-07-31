import { Card, Text, Badge, Group, Stack, Grid, Tooltip, Box, Pill, Paper } from '@mantine/core';
import { 
  IconSparkles,
  IconShield,
  IconBandage,
  IconArrowsExchange,
  IconSword,
  IconBolt,
  IconFlame,
  IconBan,
  IconWind,
  IconClock
} from '@tabler/icons-react';
import { Team } from '@/types';
import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

const gens = new Generations(Dex);
const gen = gens.get(9);

interface TeamUtilitiesProps {
  team: Team;
}

interface UtilityCheck {
  category: string;
  description: string;
  icon: React.ReactNode;
  found: boolean;
  providers: { pokemon: string; method: string }[];
}

// Utility icons mapping
const UTILITY_ICONS: Record<string, React.ReactNode> = {
  'Entry Hazards': <IconSparkles size={18} />,
  'Hazard Removal': <IconShield size={18} />,
  'Reliable Recovery': <IconBandage size={18} />,
  'Momentum': <IconArrowsExchange size={18} />,
  'Setup Moves': <IconSword size={18} />,
  'Priority Moves': <IconBolt size={18} />,
  'Status Moves': <IconFlame size={18} />,
  'Disruption': <IconBan size={18} />,
  'Speed Control': <IconClock size={18} />
};

// Move lists for different utilities
const HAZARD_MOVES: Record<string, string> = {
  'stealthrock': 'Stealth Rock',
  'spikes': 'Spikes',
  'toxicspikes': 'Toxic Spikes',
  'stickyweb': 'Sticky Web',
  'ceaselessedge': 'Ceaseless Edge',
  'stoneaxe': 'Stone Axe'
};

const REMOVAL_MOVES: Record<string, string> = {
  'defog': 'Defog',
  'rapidspin': 'Rapid Spin',
  'courtchange': 'Court Change',
  'tidyup': 'Tidy Up',
  'mortalspin': 'Mortal Spin'
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
  'strengthsap': 'Strength Sap'
};

const MOMENTUM_MOVES: Record<string, string> = {
  'uturn': 'U-turn',
  'voltswitch': 'Volt Switch',
  'flipturn': 'Flip Turn',
  'teleport': 'Teleport',
  'partingshot': 'Parting Shot',
  'chillyreception': 'Chilly Reception',
  'shedtail': 'Shed Tail'
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
  'amnesia': 'Amnesia'
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
  'nuzzle': 'Nuzzle'
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
  'grassy glide': 'Grassy Glide'
};

const DISRUPTION_MOVES: Record<string, string> = {
  'taunt': 'Taunt',
  'encore': 'Encore',
  'disable': 'Disable',
  'knockoff': 'Knock Off',
  'trick': 'Trick',
  'switcheroo': 'Switcheroo',
  'clearsmog': 'Clear Smog',
  'haze': 'Haze'
};

const SPEED_CONTROL: Record<string, string> = {
  'trickroom': 'Trick Room',
  'tailwind': 'Tailwind',
  'icywind': 'Icy Wind',
  'electroweb': 'Electroweb',
  'bulldoze': 'Bulldoze',
  'stickyweb': 'Sticky Web'
};

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
  
  // Check moves
  for (const pokemon of team.pokemon) {
    if (!pokemon.species) continue;
    
    for (const move of pokemon.moves) {
      const moveId = toID(move);
      if (moves[moveId]) {
        providers.push({ 
          pokemon: pokemon.species, 
          method: moves[moveId] 
        });
      }
    }
    
    // Check abilities
    if (abilities && pokemon.ability && abilities.includes(toID(pokemon.ability))) {
      providers.push({ 
        pokemon: pokemon.species, 
        method: pokemon.ability 
      });
    }
    
    // Check items
    if (items && pokemon.item && items.includes(toID(pokemon.item))) {
      providers.push({ 
        pokemon: pokemon.species, 
        method: pokemon.item 
      });
    }
  }
  
  // Remove duplicates
  const uniqueProviders = providers.filter((provider, index, self) =>
    index === self.findIndex(p => 
      p.pokemon === provider.pokemon && p.method === provider.method
    )
  );
  
  return { found: uniqueProviders.length > 0, providers: uniqueProviders };
}

export function TeamUtilities({ team }: TeamUtilitiesProps) {
  const activeTeam = team.pokemon.filter(p => p.species);
  
  if (activeTeam.length === 0) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text c="dimmed" ta="center">Add Pokemon to see team utilities analysis</Text>
      </Card>
    );
  }
  
  // Check all utilities
  const utilities: UtilityCheck[] = [
    {
      category: 'Entry Hazards',
      description: 'Chip damage on switch-in',
      icon: UTILITY_ICONS['Entry Hazards'],
      ...checkUtility(team, HAZARD_MOVES)
    },
    {
      category: 'Hazard Removal',
      description: 'Clear hazards from your side',
      icon: UTILITY_ICONS['Hazard Removal'],
      ...checkUtility(team, REMOVAL_MOVES, [], ['heavydutyboots'])
    },
    {
      category: 'Reliable Recovery',
      description: '50%+ HP recovery moves',
      icon: UTILITY_ICONS['Reliable Recovery'],
      ...checkUtility(team, RELIABLE_RECOVERY, ['regenerator'], ['leftovers', 'blacksludge'])
    },
    {
      category: 'Momentum',
      description: 'Pivot moves for switching',
      icon: UTILITY_ICONS['Momentum'],
      ...checkUtility(team, MOMENTUM_MOVES)
    },
    {
      category: 'Setup Moves',
      description: 'Stat boosting moves',
      icon: UTILITY_ICONS['Setup Moves'],
      ...checkUtility(team, SETUP_MOVES)
    },
    {
      category: 'Priority Moves',
      description: 'Moves with increased priority',
      icon: UTILITY_ICONS['Priority Moves'],
      ...checkUtility(team, PRIORITY_MOVES)
    },
    {
      category: 'Status Moves',
      description: 'Inflict burn, paralysis, sleep',
      icon: UTILITY_ICONS['Status Moves'],
      ...checkUtility(team, STATUS_MOVES)
    },
    {
      category: 'Disruption',
      description: 'Prevent opponent strategies',
      icon: UTILITY_ICONS['Disruption'],
      ...checkUtility(team, DISRUPTION_MOVES)
    },
    {
      category: 'Speed Control',
      description: 'Manipulate speed tiers',
      icon: UTILITY_ICONS['Speed Control'],
      ...checkUtility(team, SPEED_CONTROL, ['intimidate'])
    }
  ];
  
  // Calculate score
  const found = utilities.filter(u => u.found).length;
  const total = utilities.length;
  
  // Very lenient: need only 4/9 utilities (44%)
  const passed = found >= 4;
  const score = (found / total) * 100;
  
  // Split into found and missing
  const foundUtilities = utilities.filter(u => u.found);
  const missingUtilities = utilities.filter(u => !u.found);
  
  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={600} size="lg">Team Utilities</Text>
          <Badge 
            size="lg" 
            color={passed ? 'green' : 'red'}
          >
            {passed ? 'PASS' : 'FAIL'} - {score.toFixed(0)}%
          </Badge>
        </Group>
        
        <Grid gutter={32}>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <Group gap="xs">
                <Text size="lg" fw={700} c="green.7">✓ Available</Text>
                <Badge color="green" variant="filled" size="lg">{foundUtilities.length}</Badge>
              </Group>
              <Box
                style={{
                  height: 2,
                  backgroundColor: 'var(--mantine-color-green-6)',
                  marginBottom: 8
                }}
              />
              
              {foundUtilities.length > 0 ? (
                <Stack gap="sm">
                  {foundUtilities.map((utility) => (
                    <Paper 
                      key={utility.category} 
                      p="sm" 
                      withBorder
                      style={{
                        borderColor: 'var(--mantine-color-green-3)',
                        backgroundColor: 'var(--mantine-color-green-0)'
                      }}
                    >
                      <Group gap="sm" mb="xs">
                        <Box
                          style={{
                            color: 'var(--mantine-color-green-7)',
                            backgroundColor: 'var(--mantine-color-green-1)',
                            borderRadius: 'var(--mantine-radius-sm)',
                            padding: 6
                          }}
                        >
                          {utility.icon}
                        </Box>
                        <div style={{ flex: 1 }}>
                          <Text size="sm" fw={600}>{utility.category}</Text>
                          <Text size="xs" c="dimmed">{utility.description}</Text>
                        </div>
                      </Group>
                      <Stack gap={4} ml={36}>
                        {utility.providers.map((provider, idx) => (
                          <Group key={idx} gap="xs">
                            <Box 
                              style={{ 
                                width: 4, 
                                height: 4, 
                                borderRadius: '50%', 
                                backgroundColor: 'var(--mantine-color-green-6)' 
                              }} 
                            />
                            <Text size="xs">
                              <Text component="span" fw={500}>{provider.pokemon}</Text>
                              <Text component="span" c="dimmed"> — {provider.method}</Text>
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  No utilities found yet
                </Text>
              )}
            </Stack>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <Group gap="xs">
                <Text size="lg" fw={700} c="red.7">✗ Missing</Text>
                <Badge color="red" variant="filled" size="lg">{missingUtilities.length}</Badge>
              </Group>
              <Box
                style={{
                  height: 2,
                  backgroundColor: 'var(--mantine-color-red-6)',
                  marginBottom: 8
                }}
              />
              
              {missingUtilities.length > 0 ? (
                <Stack gap="sm">
                  {missingUtilities.map((utility) => (
                    <Paper 
                      key={utility.category} 
                      p="sm" 
                      withBorder
                      style={{
                        borderColor: 'var(--mantine-color-gray-3)',
                        backgroundColor: 'var(--mantine-color-gray-0)'
                      }}
                    >
                      <Group gap="sm" mb="xs">
                        <Box
                          style={{
                            color: 'var(--mantine-color-gray-6)',
                            backgroundColor: 'var(--mantine-color-gray-1)',
                            borderRadius: 'var(--mantine-radius-sm)',
                            padding: 6
                          }}
                        >
                          {utility.icon}
                        </Box>
                        <div style={{ flex: 1 }}>
                          <Text size="sm" fw={600} c="gray.7">{utility.category}</Text>
                          <Text size="xs" c="dimmed">{utility.description}</Text>
                        </div>
                      </Group>
                      <Text size="xs" c="gray.6" ml={36}>
                        {Object.values(
                          utility.category === 'Entry Hazards' ? HAZARD_MOVES :
                          utility.category === 'Hazard Removal' ? REMOVAL_MOVES :
                          utility.category === 'Reliable Recovery' ? RELIABLE_RECOVERY :
                          utility.category === 'Momentum' ? MOMENTUM_MOVES :
                          utility.category === 'Setup Moves' ? SETUP_MOVES :
                          utility.category === 'Priority Moves' ? PRIORITY_MOVES :
                          utility.category === 'Status Moves' ? STATUS_MOVES :
                          utility.category === 'Disruption' ? DISRUPTION_MOVES :
                          SPEED_CONTROL
                        ).slice(0, 4).join(' • ')}
                      </Text>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  All utilities covered!
                </Text>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
        
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          Teams need at least 4 utilities to pass. Consider your team archetype when choosing utilities.
        </Text>
      </Stack>
    </Card>
  );
}
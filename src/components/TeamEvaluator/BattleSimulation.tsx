import { useState, useEffect, useRef } from 'react';
import { Team } from '@/types';
import { BattleSimulator } from '@/lib/battle/simulator';
import { loadSampleTeams, TeamWithArchetype } from '@/data/sample-teams-loader';
import { analyzeTeam } from '@/lib/analysis/archetype-analyzer';
import { Card, Stack, Group, Text, Badge, Box, SimpleGrid, Progress, Paper, ThemeIcon, Center, Grid } from '@mantine/core';
import { IconTrophy, IconSwords, IconShieldOff } from '@tabler/icons-react';
import { PokemonSprite } from '@/components/common/PokemonSprite';
import { FormatId } from '@/lib/pokemon/formats';
import { ARCHETYPE_CONFIG } from '@/lib/pokemon/archetype-config';
import { TeamArchetype } from '@/types/analysis';

interface BattleSimulationProps {
  team: Team;
  format: string;
}

interface BattleResultWithTeam {
  team: TeamWithArchetype;
  archetype: string;
  result: any;
  winRate: number;
}

export function BattleSimulation({ team, format }: BattleSimulationProps) {
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState<BattleResultWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const hasStarted = useRef(false);
  const currentFormat = useRef(format);

  // Normalize team to level 100
  const normalizedTeam = {
    ...team,
    pokemon: team.pokemon.map(p => ({
      ...p,
      level: 100
    }))
  };

  useEffect(() => {
    if (currentFormat.current !== format) {
      currentFormat.current = format;
      hasStarted.current = false;
      setResults([]);
    }
    
    if (!hasStarted.current) {
      hasStarted.current = true;
      runSimulations();
    }
  }, [format, team]);

  const runSimulations = async () => {
    setLoading(true);
    setSimulating(true);
    setResults([]);
    
    const sampleTeams = await loadSampleTeams(format as FormatId);
    
    if (sampleTeams.length === 0) {
      setLoading(false);
      setSimulating(false);
      return;
    }
    
    // Defer to next tick
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const simulator = new BattleSimulator(format);
    const battleResults: BattleResultWithTeam[] = [];

    for (let i = 0; i < Math.min(sampleTeams.length, 3); i++) {
      const opponentTeam = sampleTeams[i];
      
      // Normalize opponent team to level 100
      const normalizedOpponent = {
        ...opponentTeam,
        pokemon: opponentTeam.pokemon.map(p => ({
          ...p,
          level: 100
        }))
      };
      
      // Use the archetype from the JSON if available
      const archetype = opponentTeam.archetype || analyzeTeam(normalizedOpponent).archetype;
      
      try {
        const result = await simulator.runSimulation(normalizedTeam, normalizedOpponent, 3);
        battleResults.push({
          team: normalizedOpponent,
          archetype,
          result,
          winRate: result.winRate
        });
        setResults([...battleResults]);
      } catch (error) {
        console.error(`Error simulating against team ${i + 1}:`, error);
      }
      
      // Small yield to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    setLoading(false);
    setSimulating(false);
  };

  const overallWinRate = results.length > 0
    ? results.reduce((sum, r) => sum + r.winRate, 0) / results.length
    : 0;

  const totalWins = results.filter(r => r.winRate >= 50).length;
  const totalLosses = results.filter(r => r.winRate < 50).length;
  const totalBattles = totalWins + totalLosses;
  const passed = overallWinRate >= 50;

  if (loading) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text ta="center" c="dimmed">Running battle simulations...</Text>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text ta="center" c="dimmed">No sample teams available for this format</Text>
      </Card>
    );
  }

  const getArchetypeConfig = (archetype: string) => {
    return ARCHETYPE_CONFIG[archetype as TeamArchetype] || {
      icon: <IconSwords size={20} />,
      color: 'gray',
      description: 'Unknown archetype'
    };
  };

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={600} size="lg">Battle Performance</Text>
          <Badge 
            size="lg" 
            color={passed ? 'green' : 'red'}
          >
            {passed ? 'PASS' : 'FAIL'} - {overallWinRate?.toFixed(0)}%
          </Badge>
        </Group>

        {/* Overall Stats Summary */}
        <Group justify="center" gap="md">
          <Text size="lg" fw={700} c="green.6">
            {totalWins} {totalWins === 1 ? 'victory' : 'victories'}
          </Text>
          <Text size="lg" fw={700} c="red.6">
            {totalLosses} {totalLosses === 1 ? 'defeat' : 'defeats'}
          </Text>
        </Group>

        {/* Battle Results */}
        <Grid gutter={{ base: 'sm', md: 'md' }}>
          {results.map((battle, index) => {
            const config = getArchetypeConfig(battle.archetype);
            const isVictory = battle.winRate >= 50;
            
            return (
              <Grid.Col key={index} span={{ base: 12, md: 6 }}>
                <Paper
                  p={{ base: 'sm', md: 'md' }}
                  radius="md"
                  withBorder
                  bg={isVictory ? 'green.0' : 'red.0'}
                  h="100%"
                >
                  <Stack gap="sm">
                    {/* Battle Header */}
                    <Group justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon
                          size="md"
                          radius="xl"
                          color={config.color}
                          variant="light"
                        >
                          {config.icon}
                        </ThemeIcon>
                        <div>
                          <Text fw={600} size="sm">
                            {battle.archetype} Team
                          </Text>
                          <Text size="xs" c="dimmed">
                            Test Opponent #{index + 1}
                          </Text>
                        </div>
                      </Group>
                      
                      <Center>
                        {isVictory ? (
                          <ThemeIcon size="xl" radius="xl" color="green" variant="light">
                            <IconTrophy size={24} />
                          </ThemeIcon>
                        ) : (
                          <ThemeIcon size="xl" radius="xl" color="red" variant="light">
                            <IconShieldOff size={24} />
                          </ThemeIcon>
                        )}
                      </Center>
                    </Group>

                    {/* Team Preview */}
                    <Box>
                      <SimpleGrid 
                        cols={{ base: 6, xs: 6 }} 
                        spacing={{ base: 0, xs: 2 }}
                      >
                        {battle.team.pokemon.map((pokemon, i) => (
                          <Box
                            key={i}
                            style={{
                              aspectRatio: '1/1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                            title={pokemon.species}
                          >
                            <Box
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <PokemonSprite 
                                species={pokemon.species} 
                                style={{ 
                                  width: '40px',
                                  height: '40px',
                                  objectFit: 'contain'
                                }}
                                className="pokemon-sprite-battle"
                              />
                            </Box>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </Box>

                    {/* Battle Statistics */}
                    <div>
                      <Text size="sm" fw={500}>
                        Battle Record: {battle.result.results.filter((r: any) => r.winner === 'p1').length}-{battle.result.results.filter((r: any) => r.winner === 'p2').length}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {battle.result.results.length} battles • Avg {battle.result.avgTurns.toFixed(0)} turns
                      </Text>
                    </div>
                  </Stack>
                </Paper>
              </Grid.Col>
            );
          })}
        </Grid>
      </Stack>
    </Card>
  );
}
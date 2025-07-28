import { useState, useEffect, useRef } from 'react';
import { Team } from '@/types';
import { BattleSimulator } from '@/lib/battle/simulator';
import { SAMPLE_TEAMS } from '@/data/sample-teams';
import { Card, Stack, Group, Text, Badge, Progress } from '@mantine/core';

interface BattleSimulationProps {
  team: Team;
  format: string;
}

export function BattleSimulation({ team, format }: BattleSimulationProps) {
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const hasStarted = useRef(false);

  // Normalize team to level 100
  const normalizedTeam = {
    ...team,
    pokemon: team.pokemon.map(p => ({
      ...p,
      level: 100
    }))
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    
    runSimulations();
  }, []);

  const runSimulations = async () => {
    setSimulating(true);
    
    // Defer to next tick
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const simulator = new BattleSimulator(format);
    const testTeams = SAMPLE_TEAMS[format] || [];
    const battleResults = [];

    for (let i = 0; i < testTeams.length; i++) {
      // Normalize opponent team to level 100
      const normalizedOpponent = {
        ...testTeams[i],
        pokemon: testTeams[i].pokemon.map(p => ({
          ...p,
          level: 100
        }))
      };
      
      try {
        const result = await simulator.runSimulation(normalizedTeam, normalizedOpponent, 3);
        battleResults.push(result);
        setResults([...battleResults]);
      } catch (error) {
        console.error(`Error simulating against team ${i + 1}:`, error);
      }
      
      // Small yield to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    setSimulating(false);
  };

  const overallWinRate = results.length > 0
    ? results.reduce((sum, r) => sum + r.winRate, 0) / results.length
    : 0;

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'green';
    if (winRate >= 40) return 'yellow';
    return 'red';
  };

  const passed = overallWinRate >= 50;

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

        {results.length > 0 && (
          <>
            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm">Win Rate vs Sample Teams</Text>
                <Text size="sm" fw={500}>
                  {overallWinRate?.toFixed(1)}%
                </Text>
              </Group>
              <Progress
                value={overallWinRate || 0}
                color={getWinRateColor(overallWinRate || 0)}
                size="lg"
              />
            </div>

            <Stack gap="xs">
              {results.map((result, index) => (
                <div key={index}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      vs Sample Team {index + 1}
                    </Text>
                    <Text size="sm" fw={500}>
                      {result.winRate.toFixed(0)}% ({result.results.filter((r: any) => r.winner === 'p1').length}/{result.results.length})
                    </Text>
                  </Group>
                  <Progress
                    value={result.winRate}
                    color={getWinRateColor(result.winRate)}
                    size="sm"
                  />
                </div>
              ))}
            </Stack>

            <Text size="xs" c="dimmed" ta="center">
              Simulated {results.reduce((sum, r) => sum + r.results.length, 0)} battles
              against {results.length} different teams
            </Text>
          </>
        )}
      </Stack>
    </Card>
  );
}
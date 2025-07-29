import { useState } from 'react';
import { Card, Text, Badge, Group, Stack, Tabs, Progress, Grid, Tooltip } from '@mantine/core';
import { IconSword, IconShield, IconAlertTriangle } from '@tabler/icons-react';
import { Team } from '@/types';
import { analyzeTeamCoverage, TypeName } from '@/lib/pokemon/type-coverage';

interface TypeCoverageProps {
  team: Team;
}

const TYPE_COLORS: Record<TypeName, string> = {
  Normal: '#A8A878',
  Fire: '#F08030',
  Water: '#6890F0',
  Electric: '#F8D030',
  Grass: '#78C850',
  Ice: '#98D8D8',
  Fighting: '#C03028',
  Poison: '#A040A0',
  Ground: '#E0C068',
  Flying: '#A890F0',
  Psychic: '#F85888',
  Bug: '#A8B820',
  Rock: '#B8A038',
  Ghost: '#705898',
  Dragon: '#7038F8',
  Dark: '#705848',
  Steel: '#B8B8D0',
  Fairy: '#EE99AC',
};

export function TypeCoverage({ team }: TypeCoverageProps) {
  const [activeTab, setActiveTab] = useState<string | null>('offensive');
  
  // Only analyze Pokemon that are actually on the team
  const activeTeamMembers = team.pokemon.filter(p => p.species);
  const hasTeraTypes = activeTeamMembers.some(p => p.teraType);
  
  if (activeTeamMembers.length === 0) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text c="dimmed" ta="center">Add Pokemon to see type coverage analysis</Text>
      </Card>
    );
  }
  
  const coverage = analyzeTeamCoverage(activeTeamMembers);
  
  const getCoverageColor = (count: number) => {
    if (count === 0) return 'red';
    if (count < 1) return 'orange'; // Partial coverage from tera
    if (count === 1) return 'yellow';
    if (count >= 2) return 'green';
    return 'blue';
  };
  
  const getWeaknessColor = (count: number) => {
    if (count <= 0.25) return 'green';
    if (count <= 1) return 'blue';
    if (count <= 2) return 'yellow';
    return 'red';
  };
  
  const getResistanceColor = (count: number) => {
    if (count === 0) return 'gray';
    if (count < 1) return 'blue.3'; // Partial from tera
    if (count === 1) return 'blue';
    if (count >= 2) return 'green';
    return 'teal';
  };
  
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];
  
  // Calculate overall grade
  const offensiveScore = (18 - coverage.offensive.uncovered.length) / 18 * 100;
  const defensiveScore = (18 - coverage.defensive.commonWeaknesses.length * 3) / 18 * 100;
  const overallScore = (offensiveScore + defensiveScore) / 2;
  const passed = overallScore >= 70;
  
  // Format count display to show tera contributions
  const formatCount = (count: number) => {
    if (Number.isInteger(count)) return count.toString();
    return count.toFixed(2);
  };
  
  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={600} size="lg">Type Coverage Analysis</Text>
          <Badge 
            size="lg" 
            color={passed ? 'green' : 'red'}
          >
            {passed ? 'PASS' : 'FAIL'} - {overallScore.toFixed(0)}%
          </Badge>
        </Group>
        
        <Tabs value={activeTab} onChange={setActiveTab} style={{ textAlign: 'center' }}>
          <Tabs.List grow>
              <Tabs.Tab value="offensive" leftSection={<IconSword size={16} />}>
              Offensive Coverage
              </Tabs.Tab>
              <Tabs.Tab value="defensive" leftSection={<IconShield size={16} />}>
              Defensive Coverage
              </Tabs.Tab>
          </Tabs.List>
          
          <Tabs.Panel value="offensive" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">
                Shows how many Pokemon can hit each type super effectively
                {hasTeraTypes && ' (Tera types contribute 0.25 to coverage)'}
              </Text>
              
              {coverage.offensive.uncovered.length > 0 && (
                <Card withBorder bg="red.0">
                  <Group gap="xs">
                    <IconAlertTriangle size={16} color="red" />
                    <Text size="sm" c="red" fw={500}>
                      No super effective coverage against:
                    </Text>
                    {coverage.offensive.uncovered.map(type => (
                      <Badge key={type} color="red" variant="light">
                        {type}
                      </Badge>
                    ))}
                  </Group>
                </Card>
              )}
              
              <Grid>
                {allTypes.map(type => {
                  const count = coverage.offensive.coverage[type];
                  const hasTeraBoost = !Number.isInteger(count) && count > 0;
                  
                  return (
                    <Grid.Col key={type} span={3}>
                      <Tooltip label={
                        `${Math.floor(count)} Pokemon can hit ${type} super effectively` +
                        (hasTeraBoost ? ' (+ Tera coverage)' : '')
                      }>
                        <Card 
                          p="xs" 
                          style={{ 
                            backgroundColor: TYPE_COLORS[type] + '20',
                            borderColor: TYPE_COLORS[type],
                            borderWidth: 1,
                            borderStyle: 'solid'
                          }}
                        >
                          <Stack gap={4} align="center">
                            <Text size="xs" fw={600}>{type}</Text>
                            <Badge size="sm" color={getCoverageColor(count)}>
                              {formatCount(count)}
                            </Badge>
                          </Stack>
                        </Card>
                      </Tooltip>
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Stack>
          </Tabs.Panel>
          
          <Tabs.Panel value="defensive" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">
                Shows team weaknesses and resistances to each type
                {hasTeraTypes && ' (Tera types contribute 0.25 to defensive coverage)'}
              </Text>
              
              {coverage.defensive.commonWeaknesses.length > 0 && (
                <Card withBorder bg="red.0">
                  <Group gap="xs">
                    <IconAlertTriangle size={16} color="red" />
                    <Text size="sm" c="red" fw={500}>
                      Major weaknesses (3+ Pokemon):
                    </Text>
                    {coverage.defensive.commonWeaknesses.map(type => (
                      <Badge key={type} color="red" variant="filled">
                        {type}
                      </Badge>
                    ))}
                  </Group>
                </Card>
              )}
              
              <div>
                <Text size="sm" fw={600} mb="xs">Weaknesses</Text>
                <Grid>
                  {allTypes.map(type => {
                    const count = coverage.defensive.weaknesses[type];
                    const hasTeraChange = !Number.isInteger(count);
                    
                    return (
                      <Grid.Col key={type} span={3}>
                        <Tooltip label={
                          `${Math.floor(count)} Pokemon are weak to ${type}` +
                          (hasTeraChange ? ' (Tera affects this)' : '')
                        }>
                          <Card 
                            p="xs" 
                            style={{ 
                              backgroundColor: TYPE_COLORS[type] + '20',
                              borderColor: TYPE_COLORS[type],
                              borderWidth: 1,
                              borderStyle: 'solid'
                            }}
                          >
                            <Stack gap={4} align="center">
                              <Text size="xs" fw={600}>{type}</Text>
                              <Badge size="sm" color={getWeaknessColor(count)}>
                                {formatCount(count)}
                              </Badge>
                            </Stack>
                          </Card>
                        </Tooltip>
                      </Grid.Col>
                    );
                  })}
                </Grid>
              </div>
              
              <div>
                <Text size="sm" fw={600} mb="xs">Resistances</Text>
                <Grid>
                  {allTypes.map(type => {
                    const count = coverage.defensive.resistances[type];
                    const hasTeraChange = !Number.isInteger(count);
                    
                    return (
                      <Grid.Col key={type} span={3}>
                        <Tooltip label={
                          `${Math.floor(count)} Pokemon resist ${type}` +
                          (hasTeraChange ? ' (+ Tera resistance)' : '')
                        }>
                          <Card 
                            p="xs" 
                            style={{ 
                              backgroundColor: TYPE_COLORS[type] + '20',
                              borderColor: TYPE_COLORS[type],
                              borderWidth: 1,
                              borderStyle: 'solid'
                            }}
                          >
                            <Stack gap={4} align="center">
                              <Text size="xs" fw={600}>{type}</Text>
                              <Badge size="sm" color={getResistanceColor(count)}>
                                {formatCount(count)}
                              </Badge>
                            </Stack>
                          </Card>
                        </Tooltip>
                      </Grid.Col>
                    );
                  })}
                </Grid>
              </div>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}
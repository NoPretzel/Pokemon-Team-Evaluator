import { useState } from 'react';
import { Card, Text, Stack, Tabs, Grid, Box, Alert, Group, Divider, Badge } from '@mantine/core';
import { IconSword, IconShield, IconAlertTriangle } from '@tabler/icons-react';
import { Team } from '@/types';
import { analyzeTeamCoverageRatings, TypeName, TERA_WEIGHT } from '@/lib/pokemon/type-coverage';
import { TypeSprite } from '@/components/common/TypeSprite';

interface TypeCoverageProps {
  team: Team;
}

export function TypeCoverage({ team }: TypeCoverageProps) {
  const [activeTab, setActiveTab] = useState<string | null>('offensive');
  
  const activeTeamMembers = team.pokemon.filter(p => p.species);
  
  if (activeTeamMembers.length === 0) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text c="dimmed" ta="center">Add Pokemon to see type coverage analysis</Text>
      </Card>
    );
  }
  
  const coverage = analyzeTeamCoverageRatings(activeTeamMembers);
  
  const allTypes: TypeName[] = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
  ];
  
  const TypeRatingCard = ({ type, rating, context }: { type: TypeName; rating: number; context: 'offensive' | 'defensive' }) => {
    const typeClass = `type-${type.toLowerCase()}`;
    
    const typeColor = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC',
    }[type.toLowerCase()] || '#68A090';
    
    const getRatingColor = () => {
      if (context === 'offensive') {
        if (rating === 0) return '#EF4444'; // red
        if (rating < 1) return '#D4B900'; // yellow
        return '#22C55E'; // green
      } else {
        // Defensive
        if (rating < 0) return '#EF4444'; // red
        if (rating === 0) return '#000000'; // black
        return '#22C55E'; // green
      }
    };
    
    const getOpacity = () => {
      if (context === 'offensive' && rating === 0) return 0.7;
      if (context === 'defensive' && rating === 0) return 0.8;
      return 1;
    };
    
    const formatRating = (r: number) => {
      if (r === 0) return '0';
      const formatted = Number.isInteger(r) ? r.toString() : r.toFixed(2);
      return r > 0 ? `+${formatted}` : formatted;
    };
    
    return (
      <Box>
        <div style={{ 
          borderRadius: '6px',
          overflow: 'hidden',
          opacity: getOpacity(),
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div 
            className={typeClass}
            style={{ 
              padding: '8px 4px 6px',
              textAlign: 'center',
            }}
          >
            <Text size="sm" fw={600} c="white">
              {type}
            </Text>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '6px',
            textAlign: 'center',
            borderLeft: `2px solid ${typeColor}`,
            borderRight: `2px solid ${typeColor}`,
            borderBottom: `2px solid ${typeColor}`,
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px'
          }}>
            <Text size="sm" fw={700} c={getRatingColor()}>
              {formatRating(rating)}
            </Text>
          </div>
        </div>
      </Box>
    );
  };
  
  const Legend = ({ context }: { context: 'offensive' | 'defensive' }) => (
    <Box mt="md" style={{ display: 'flex', justifyContent: 'center' }}>
      <Card 
        withBorder 
        p="sm" 
        radius="md"
        style={{ 
          backgroundColor: '#FFFFFF',
          borderColor: '#228be6',
          borderWidth: '2px',
          display: 'inline-block'
        }}
      >
        <Text size="sm" fw={700} mb="xs" ta="center">
          Rating System
        </Text>
        {context === 'offensive' ? (
          <>
            <Group gap="xs" mb="xs" justify="center">
              <Text size="xs">4× super effective: <Text span fw={600}>+2</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">2× super effective: <Text span fw={600}>+1</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">Tera coverage: <Text span fw={600}>+{TERA_WEIGHT}</Text></Text>
            </Group>
            <Divider my="xs" />
            <Group gap="xs" justify="center">
              <Group gap={4}>
                <Box w={12} h={12} bg="red" style={{ borderRadius: '2px' }} />
                <Text size="xs">No coverage</Text>
              </Group>
              <Divider orientation="vertical" />
              <Group gap={4}>
                <Box w={12} h={12} bg="#D4B900" style={{ borderRadius: '2px' }} />
                <Text size="xs">Low coverage</Text>
              </Group>
              <Divider orientation="vertical" />
              <Group gap={4}>
                <Box w={12} h={12} bg="green" style={{ borderRadius: '2px' }} />
                <Text size="xs">Has coverage</Text>
              </Group>
            </Group>
          </>
        ) : (
          <>
            <Group gap="xs" mb="xs" justify="center">
              <Text size="xs">Immunity: <Text span fw={600}>+3</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">0.25× resist: <Text span fw={600}>+2</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">0.5× resist: <Text span fw={600}>+1</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">2× weak: <Text span fw={600}>-1</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">4× weak: <Text span fw={600}>-2</Text></Text>
              <Divider orientation="vertical" />
              <Text size="xs">Tera: <Text span fw={600}>+/- {TERA_WEIGHT}</Text></Text>
            </Group>
            <Divider my="xs" />
            <Group gap="xs" justify="center">
              <Group gap={4}>
                <Box w={12} h={12} bg="red" style={{ borderRadius: '2px' }} />
                <Text size="xs">Vulnerable</Text>
              </Group>
              <Divider orientation="vertical" />
              <Group gap={4}>
                <Box w={12} h={12} bg="black" style={{ borderRadius: '2px' }} />
                <Text size="xs">Neutral</Text>
              </Group>
              <Divider orientation="vertical" />
              <Group gap={4}>
                <Box w={12} h={12} bg="green" style={{ borderRadius: '2px' }} />
                <Text size="xs">Resistant</Text>
              </Group>
            </Group>
          </>
        )}
      </Card>
    </Box>
  );
  
  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack>
        <Group justify="space-between" align="center">
          <Text fw={600} size="lg">Type Coverage Analysis</Text>
          {(() => {
            // Calculate overall score
            const offensiveCovered = 18 - coverage.offensive.uncovered.length;
            const offensiveScore = (offensiveCovered / 18) * 100;
            const defensiveIssues = coverage.defensive.vulnerable.length;
            const defensiveScore = Math.max(0, 100 - (defensiveIssues * 10));
            const overallScore = Math.round(offensiveScore * 0.6 + defensiveScore * 0.4);
            const passed = overallScore >= 65;
            
            return (
              <Badge 
                size="lg" 
                color={passed ? 'green' : 'red'}
              >
                {passed ? 'PASS' : 'FAIL'} - {overallScore}%
              </Badge>
            );
          })()}
        </Group>        
        <Tabs value={activeTab} onChange={setActiveTab}>
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
              {coverage.offensive.uncovered.length > 0 && (
                <Alert 
                  icon={<IconAlertTriangle size={16} />} 
                  color="red" 
                  variant="light"
                  styles={{
                    icon: {
                      alignSelf: 'center',
                      marginRight: '8px'
                    },
                    body: {
                      paddingLeft: 0
                    }
                  }}
                >
                  <Box style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    gap: '8px',
                    columnGap: '8px',
                    rowGap: '0px'
                  }}>
                    <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                      No coverage against:
                    </Text>
                    {coverage.offensive.uncovered.map(type => (
                      <TypeSprite key={type} type={type} size={32} style={{ margin: 0, padding: 0 }} />
                    ))}
                  </Box>
                </Alert>
              )}
              
              <Grid gutter="sm">
                {allTypes.map(type => (
                  <Grid.Col key={type} span={{ base: 6, xs: 4, sm: 3, md: 2 }}>
                    <TypeRatingCard 
                      type={type} 
                      rating={coverage.offensive.ratings[type]} 
                      context="offensive"
                    />
                  </Grid.Col>
                ))}
              </Grid>
              
              <Legend context="offensive" />
            </Stack>
          </Tabs.Panel>
          
          <Tabs.Panel value="defensive" pt="md">
            <Stack>
              {coverage.defensive.vulnerable.length > 0 && (
                <Alert 
                  icon={<IconAlertTriangle size={16} />} 
                  color="red" 
                  variant="light"
                  styles={{
                    icon: {
                      alignSelf: 'center',
                      marginRight: '8px'
                    },
                    body: {
                      paddingLeft: 0
                    }
                  }}
                >
                  <Box style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    gap: '8px',
                    columnGap: '8px',
                    rowGap: '0px'
                  }}>
                    <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Team is vulnerable to:
                    </Text>
                    {coverage.defensive.vulnerable.map(type => (
                      <TypeSprite key={type} type={type} size={32} style={{ margin: 0, padding: 0 }} />
                    ))}
                  </Box>
                </Alert>
              )}
              
              <Grid gutter="sm">
                {allTypes.map(type => (
                  <Grid.Col key={type} span={{ base: 6, xs: 4, sm: 3, md: 2 }}>
                    <TypeRatingCard 
                      type={type} 
                      rating={coverage.defensive.ratings[type]} 
                      context="defensive"
                    />
                  </Grid.Col>
                ))}
              </Grid>
              
              <Legend context="defensive" />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}
import { Card, Text, Badge, Group, Progress, Stack, Title } from '@mantine/core';
import { TeamAnalysis } from '@/types/analysis';

interface TeamArchetypeProps {
  analysis: TeamAnalysis;
}

export function TeamArchetype({ analysis }: TeamArchetypeProps) {
  const getArchetypeColor = (archetype: string) => {
    switch (archetype) {
      case 'Hyper Offense': return 'red';
      case 'Offense': return 'orange';
      case 'Bulky Offense': return 'yellow';
      case 'Balance': return 'green';
      case 'Semi-Stall': return 'blue';
      case 'Stall': return 'indigo';
      default: return 'gray';
    }
  };

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Title order={4}>Team Archetype</Title>
          <Badge 
            size="xl" 
            color={getArchetypeColor(analysis.archetype)}
            variant="filled"
          >
            {analysis.archetype}
          </Badge>
        </Group>

        <Stack gap="xs">
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm">Offensive Pressure</Text>
              <Text size="sm" fw={500}>{analysis.offensiveScore}</Text>
            </Group>
            <Progress 
              value={(analysis.offensiveScore / 300) * 100} 
              color="red" 
              size="md"
            />
          </div>

          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm">Defensive Bulk</Text>
              <Text size="sm" fw={500}>{analysis.defensiveScore}</Text>
            </Group>
            <Progress 
              value={(analysis.defensiveScore / 300) * 100} 
              color="blue" 
              size="md"
            />
          </div>

          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm">Speed Control</Text>
              <Text size="sm" fw={500}>{analysis.speedScore}</Text>
            </Group>
            <Progress 
              value={(analysis.speedScore / 400) * 100} 
              color="yellow" 
              size="md"
            />
          </div>
        </Stack>

        <Stack gap={4}>
          <Group gap="xs">
            <Text size="sm" c={analysis.hazardControl.hasHazards ? 'green' : 'red'}>
              {analysis.hazardControl.hasHazards ? '✓' : '✗'} Hazards
            </Text>
            {analysis.hazardControl.hazardSetters.length > 0 && (
              <Text size="xs" c="dimmed">
                ({analysis.hazardControl.hazardSetters.join(', ')})
              </Text>
            )}
          </Group>

          <Group gap="xs">
            <Text size="sm" c={analysis.hazardControl.hasHazardRemoval ? 'green' : 'red'}>
              {analysis.hazardControl.hasHazardRemoval ? '✓' : '✗'} Hazard Removal
            </Text>
            {analysis.hazardControl.hazardRemovers.length > 0 && (
              <Text size="xs" c="dimmed">
                ({analysis.hazardControl.hazardRemovers.join(', ')})
              </Text>
            )}
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}
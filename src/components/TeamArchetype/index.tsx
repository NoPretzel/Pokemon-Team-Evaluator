import { Paper, Group, Text, ThemeIcon, Box } from '@mantine/core';
import { TeamArchetype } from '@/types/analysis';
import { ARCHETYPE_CONFIG } from '@/lib/pokemon/archetype-config';

interface TeamArchetypeDisplayProps {
  archetype: TeamArchetype;
}

export function TeamArchetypeDisplay({ archetype }: TeamArchetypeDisplayProps) {
  const config = ARCHETYPE_CONFIG[archetype];
  
  return (
    <Box mb="xl">
      <Paper 
        shadow="sm" 
        radius="md" 
        withBorder 
        p="md"
        className="top-level-card"
        style={{
          background: `linear-gradient(135deg, 
            var(--mantine-color-${config.color}-0) 0%, 
            var(--mantine-color-${config.color}-1) 100%)`
        }}
      >
        <Group justify="center" gap="md">
          <ThemeIcon
            size="xl"
            radius="xl"
            color={config.color}
            variant="filled"
          >
            {config.icon}
          </ThemeIcon>
          <div style={{ textAlign: 'center' }}>
            <Text size="lg" fw={600} c="dark">
              Detected Team Type: {archetype}
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {config.description}
            </Text>
          </div>
        </Group>
      </Paper>
    </Box>
  );
}
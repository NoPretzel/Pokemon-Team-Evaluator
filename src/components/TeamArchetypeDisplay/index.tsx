import { Paper, Group, Text, ThemeIcon, Box } from '@mantine/core';
import { 
  IconFlame,
  IconSword,
  IconShieldCheck,
  IconScale,
  IconShield,
  IconWall
} from '@tabler/icons-react';
import { TeamArchetype } from '@/types/analysis';

interface TeamArchetypeDisplayProps {
  archetype: TeamArchetype;
}

const ARCHETYPE_CONFIG: Record<TeamArchetype, {
  icon: React.ReactNode;
  color: string;
  description: string;
}> = {
  'Hyper Offense': {
    icon: <IconFlame size={24} />,
    color: 'red',
    description: 'Maximum offensive pressure with setup sweepers'
  },
  'Offense': {
    icon: <IconSword size={24} />,
    color: 'orange',
    description: 'Fast-paced aggression with momentum control'
  },
  'Bulky Offense': {
    icon: <IconShieldCheck size={24} />,
    color: 'yellow',
    description: 'Offensive pressure backed by defensive pivots'
  },
  'Balance': {
    icon: <IconScale size={24} />,
    color: 'green',
    description: 'Well-rounded team with multiple win conditions'
  },
  'Semi-Stall': {
    icon: <IconShield size={24} />,
    color: 'blue',
    description: 'Defensive core with limited offensive options'
  },
  'Stall': {
    icon: <IconWall size={24} />,
    color: 'indigo',
    description: 'Maximum defensive investment and passive damage'
  }
};

export function TeamArchetypeDisplay({ archetype }: TeamArchetypeDisplayProps) {
  const config = ARCHETYPE_CONFIG[archetype];
  
  return (
    <Box mb="xl">
      <Paper 
        shadow="sm" 
        radius="md" 
        withBorder 
        p="md"
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
import { 
  IconFlame,
  IconSword,
  IconShieldCheck,
  IconScale,
  IconShield,
  IconClock
} from '@tabler/icons-react';
import { TeamArchetype } from '@/types/analysis';

export const ARCHETYPE_CONFIG: Record<TeamArchetype, {
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
    icon: <IconClock size={24} />,
    color: 'indigo',
    description: 'Maximum defensive investment and passive damage'
  }
};
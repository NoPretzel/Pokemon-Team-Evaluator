import { 
  IconFlame,
  IconSword,
  IconShieldCheck,
  IconScale,
  IconShield,
  IconHourglass,
  IconWind,
  IconClock,
  IconCloudRain,
  IconSparkles
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
    description: 'All out offense aiming to overwhelm before the opponent can respond'
  },
  'Offense': {
    icon: <IconSword size={24} />,
    color: 'orange',
    description: 'Fast paced teams that maintain constant pressure and momentum'
  },
  'Bulky Offense': {
    icon: <IconShieldCheck size={24} />,
    color: 'yellow',
    description: 'Strong attackers supported by durable switch-ins for key threats'
  },
  'Balance': {
    icon: <IconScale size={24} />,
    color: 'green',
    description: 'Versatile teams that can adapt to different situations and playstyles'
  },
  'Semi-Stall': {
    icon: <IconShield size={24} />,
    color: 'blue',
    description: 'Defensive teams that slowly wear down opponents while limiting their options'
  },
  'Stall': {
    icon: <IconClock size={24} />,
    color: 'indigo',
    description: 'Ultra defensive teams built to outlast opponents through attrition'
  },
  'Trick Room': {
    icon: <IconClock size={24} />,
    color: 'violet',
    description: 'Slow, bulky attackers that excel under Trick Room'
  },
  'Tailwind': {
    icon: <IconWind size={24} />,
    color: 'teal',
    description: 'Fast attackers that benefit from Tailwind speed control'
  },
  'Weather': {
    icon: <IconCloudRain size={24} />,
    color: 'cyan',
    description: 'Team built around weather conditions like sun or rain'
  },
  'Hard Trick Room': {
    icon: <IconClock size={24} />,
    color: 'grape',
    description: 'Dedicated Trick Room team with multiple setters'
  },
  'Goodstuff': {
    icon: <IconSparkles size={24} />,
    color: 'pink',
    description: 'Strong individual Pokemon without specific strategy'
  }
};
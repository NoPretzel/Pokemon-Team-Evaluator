import { Team } from '@/types';
import { FormatId } from '@/lib/pokemon/formats';

export interface TeamWithArchetype extends Team {
  archetype?: string;
}

export async function loadSampleTeams(format: FormatId): Promise<TeamWithArchetype[]> {
  try {
    const teams = await import(`@/data/sample teams/${format}.json`)
      .then(module => module.default || module)
      .catch(() => {
        console.warn(`No sample teams found for format: ${format}`);
        return [];
      });
    
    return teams as TeamWithArchetype[];
  } catch (error) {
    console.error(`Failed to load sample teams for ${format}:`, error);
    return [];
  }
}
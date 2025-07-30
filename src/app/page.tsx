'use client';

import { useState, useEffect } from 'react';
import { Container, Stack, Title, Text, Center } from '@mantine/core';
import { TeamImporter } from '@/components/TeamImporter';
import { TeamDisplay } from '@/components/TeamDisplay';
import { TeamArchetype } from '@/components/TeamEvaluator/TeamArchetype';
import { Team } from '@/types';
import { FormatId } from '@/lib/pokemon/formats';
import { analyzeTeam } from '@/lib/analysis/archetype-analyzer';
import { TeamAnalysis } from '@/types/analysis';
import { BattleSimulation } from '@/components/TeamEvaluator/BattleSimulation';
import { TypeCoverage } from '@/components/TeamEvaluator/TypeCoverage';
import { MetaCoverage } from '@/components/TeamEvaluator/MetaCoverage';

export default function Home() {
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('gen9ou');
  const [team, setTeam] = useState<Team | null>(null);
  const [teamAnalysis, setTeamAnalysis] = useState<TeamAnalysis | null>(null);

  useEffect(() => {
    if (team && team.pokemon.length > 0) {
      const analysis = analyzeTeam(team);
      setTeamAnalysis(analysis);
    } else {
      setTeamAnalysis(null);
    }
  }, [team]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Center>
          <div>
            <Title order={1} ta="center" mb="xs">
              Pokemon Team Evaluator
            </Title>
            <Text ta="center" c="dimmed" size="lg">
              Evaluate and optimize your Pokemon Showdown teams
            </Text>
          </div>
        </Center>

        <TeamImporter 
          format={selectedFormat}
          onFormatChange={setSelectedFormat}
          onTeamImport={setTeam}
        />
        
        {team && (
          <>
            <TeamDisplay 
              team={team} 
              format={selectedFormat}
            />

            {teamAnalysis && (
              <>
                <TeamArchetype analysis={teamAnalysis} />
                <BattleSimulation team={team} format={selectedFormat} />
                <TypeCoverage team={team} />
                <MetaCoverage team={team} format={selectedFormat} />
              </>
            )}            
          </>
        )}
      </Stack>
    </Container>
  );
}
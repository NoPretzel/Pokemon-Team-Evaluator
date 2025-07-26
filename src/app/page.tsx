'use client';

import { useState } from 'react';
import { Container, Stack, Title, Text, Center } from '@mantine/core';
import { TeamImporter } from '@/components/TeamImporter';
import { TeamDisplay } from '@/components/TeamDisplay';
import { Team } from '@/types';
import { FormatId } from '@/lib/pokemon/formats';

export default function Home() {
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('gen9ou');
  const [team, setTeam] = useState<Team | null>(null);

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
          <TeamDisplay 
            team={team} 
            format={selectedFormat}
          />
        )}
      </Stack>
    </Container>
  );
}
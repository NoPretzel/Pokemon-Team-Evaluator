'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Stack, Title, Text, Center, Box, Modal, Textarea, Button } from '@mantine/core';
import { TeamImporter } from '@/components/TeamImporter';
import { TeamSummary } from '@/components/TeamSummary';
import { TeamArchetypeDisplay } from '@/components/TeamArchetypeDisplay';
import { Team } from '@/types';
import { FormatId } from '@/lib/pokemon/formats';
import { analyzeTeam } from '@/lib/analysis/archetype-analyzer';
import { TeamAnalysis } from '@/types/analysis';
import { BattleSimulation } from '@/components/TeamEvaluator/BattleSimulation';
import { TypeCoverage } from '@/components/TeamEvaluator/TypeCoverage';
import { MetaCoverage } from '@/components/TeamEvaluator/MetaCoverage';
import { TeamUtilities } from '@/components/TeamEvaluator/TeamUtilities';
import { exportShowdownTeam } from '@/lib/pokemon/team-parser';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export default function Home() {
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('gen9ou');
  const [team, setTeam] = useState<Team | null>(null);
  const [teamAnalysis, setTeamAnalysis] = useState<TeamAnalysis | null>(null);
  const [showExportModal, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
  const [copiedExport, setCopiedExport] = useState(false);
  
  const battleSimRef = useRef<HTMLDivElement>(null);
  const importerRef = useRef<HTMLDivElement>(null);
  const archetypeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (team && team.pokemon.length > 0) {
      const analysis = analyzeTeam(team);
      setTeamAnalysis(analysis);
    } else {
      setTeamAnalysis(null);
    }
  }, [team]);

  const smoothScrollTo = (element: HTMLElement | null, duration: number = 1500, offset: number = 0) => {
    if (!element) return;
    
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;
    
    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Easing function for smooth acceleration/deceleration
      const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      
      window.scrollTo(0, startPosition + (distance * easeInOutCubic(progress)));
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    };
    
    requestAnimationFrame(animation);
  };

  const handleEvaluateTeam = () => {
    setTimeout(() => {
      smoothScrollTo(archetypeRef.current, 1500, 20);
    }, 100);
  };

  const handleEditTeam = () => {
    // Scroll back to the importer/builder
    smoothScrollTo(importerRef.current, 1000, 0);
  };

  const handleExportTeam = () => {
    openExportModal();
  };

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

        <Box ref={importerRef}>
          <TeamImporter 
            format={selectedFormat}
            onFormatChange={setSelectedFormat}
            onTeamImport={setTeam}
            onEvaluate={handleEvaluateTeam}
          />
        </Box>
        
        {team && (
          <Stack gap="xl">
            <TeamSummary 
              team={team} 
              format={selectedFormat}
              onEdit={handleEditTeam}
              onExport={handleExportTeam}
            />

            {teamAnalysis && (
              <>
                <Box ref={archetypeRef}>
                  <TeamArchetypeDisplay archetype={teamAnalysis.archetype} />
                </Box>
                
                <Box ref={battleSimRef}>
                  <BattleSimulation team={team} format={selectedFormat} />
                </Box>
                
                <TypeCoverage team={team} />
                <MetaCoverage team={team} format={selectedFormat} />
                <TeamUtilities team={team} />
              </>
            )}            
          </Stack>
        )}
      </Stack>

      {team && (
        <Modal
          opened={showExportModal}
          onClose={() => {
            closeExportModal();
            setCopiedExport(false);
          }}
          title="Export Team"
          size="md"
        >
          <Stack gap="md">
            <Textarea
              value={exportShowdownTeam(team)}
              readOnly
              minRows={15}
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }
              }}
            />
            <Button
              fullWidth
              leftSection={copiedExport ? <IconCheck size={16} /> : <IconCopy size={16} />}
              color={copiedExport ? 'green' : 'blue'}
              onClick={() => {
                navigator.clipboard.writeText(exportShowdownTeam(team));
                setCopiedExport(true);
                setTimeout(() => setCopiedExport(false), 2000);
              }}
            >
              {copiedExport ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </Stack>
        </Modal>
      )}
    </Container>
  );
}
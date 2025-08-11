'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Stack, Title, Text, Center, Box, Modal, Textarea, Button, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('gen9ou');
  const [team, setTeam] = useState<Team | null>(null);
  const [teamAnalysis, setTeamAnalysis] = useState<TeamAnalysis | null>(null);
  const [showExportModal, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [loaderPosition, setLoaderPosition] = useState({ top: '50%' });
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  const battleSimRef = useRef<HTMLDivElement>(null);
  const importerRef = useRef<HTMLDivElement>(null);
  const archetypeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (team && team.pokemon.length > 0 && hasEvaluated) {
      const analysis = analyzeTeam(team);
      setTeamAnalysis(analysis);
    } else if (!hasEvaluated) {
      setTeamAnalysis(null);
    }
  }, [team, hasEvaluated]);

  useEffect(() => {
    if (isEvaluating && importerRef.current) {
      const importerRect = importerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const importerBottom = importerRect.bottom;
      
      const middlePosition = importerBottom + (viewportHeight - importerBottom) / 2;
      
      setLoaderPosition({
        top: `${middlePosition}px`
      });
    }
  }, [isEvaluating]);

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
    setIsEvaluating(true);
    setHasEvaluated(true);
    
    // Simulate evaluation time
    setTimeout(() => {
      setIsEvaluating(false);
      // Small delay to ensure content is rendered
      setTimeout(() => {
        smoothScrollTo(archetypeRef.current, 1500, 20);
      }, 100);
    }, 2000);
  };

  const handleEditTeam = () => {
    // Reset evaluation state when going back to edit
    setHasEvaluated(false);
    // Scroll back to the importer/builder
    smoothScrollTo(importerRef.current, 1000, 0);
  };

  const handleExportTeam = () => {
    openExportModal();
  };

  return (
    <>
      <Box 
        style={{ 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '16px' : '24px'
        }}
      >
        <Container size="sm" style={{ width: '100%' }}>
          <Stack gap="xl">
            <Center>
              <Stack gap="xs" align="center">
                <Title order={1} ta="center" size={isMobile ? 'h2' : 'h1'}>
                  Pokemon Team Evaluator
                </Title>
                <Text ta="center" c="dimmed" size={isMobile ? 'sm' : 'lg'}>
                  Evaluate and optimize your Pokemon Showdown teams
                </Text>
              </Stack>
            </Center>

            <Box ref={importerRef}>
              <TeamImporter 
                format={selectedFormat}
                onFormatChange={setSelectedFormat}
                onTeamImport={setTeam}
                onEvaluate={handleEvaluateTeam}
              />
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Loader */}
      {isEvaluating && (
        <Box 
          style={{ 
            position: 'fixed',
            top: loaderPosition.top,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100
          }}
        >
          <Box
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-blue-6)',
              animation: 'pulse 1.2s ease-in-out infinite'
            }}
          />
        </Box>
      )}
      
      {team && teamAnalysis && hasEvaluated && (
        <Container size="xl" py="xl">
          <Stack gap="xl">
            <TeamSummary 
              team={team} 
              format={selectedFormat}
              onEdit={handleEditTeam}
              onExport={handleExportTeam}
            />

            <Box ref={archetypeRef}>
              <TeamArchetypeDisplay archetype={teamAnalysis.archetype} />
            </Box>
            
            <Box ref={battleSimRef}>
              <BattleSimulation team={team} format={selectedFormat} />
            </Box>
            
            <TypeCoverage team={team} />
            <MetaCoverage team={team} format={selectedFormat} />
            <TeamUtilities team={team} />
          </Stack>
        </Container>
      )}

      {team && (
        <Modal
          opened={showExportModal}
          onClose={() => {
            closeExportModal();
            setCopiedExport(false);
          }}
          title="Export Team"
          size="md"
          fullScreen={isMobile}
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
    </>
  );
}
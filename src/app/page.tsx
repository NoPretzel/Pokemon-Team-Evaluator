'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Stack, Title, Text, Center, Box, Modal, Textarea, Button, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { TeamImporter } from '@/components/TeamImporter';
import { TeamSummary } from '@/components/TeamSummary';
import { TeamArchetypeDisplay } from '@/components/TeamArchetype';
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
  const isMobile = useMediaQuery('(max-width: 768px)', undefined, {
    getInitialValueInEffect: true,
  });
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('gen9ou');
  const [team, setTeam] = useState<Team | null>(null);
  const [teamAnalysis, setTeamAnalysis] = useState<TeamAnalysis | null>(null);
  const [showExportModal, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [loaderPosition, setLoaderPosition] = useState({ top: '50%' });
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [editTeamText, setEditTeamText] = useState('');
  const [extraScrollPadding, setExtraScrollPadding] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const needsExtraScrollRef = useRef(false);
  
  const battleSimRef = useRef<HTMLDivElement>(null);
  const importerRef = useRef<HTMLDivElement>(null);
  const archetypeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (team && team.pokemon.length > 0 && hasEvaluated) {
      const analysis = analyzeTeam(team, selectedFormat);
      setTeamAnalysis(analysis);
    } else if (!hasEvaluated) {
      setTeamAnalysis(null);
    }
  }, [team, hasEvaluated, selectedFormat]);

  const smoothScrollTo = (element: HTMLElement | null, duration: number = 1500, offset: number = 0) => {
    if (!element) return;
    
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset + offset;
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
    setShowLoader(false);
    needsExtraScrollRef.current = false;
    
    // Calculate loader position and check available space
    setTimeout(() => {
      if (importerRef.current) {
        const importerRect = importerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const importerBottom = importerRect.bottom + scrollTop;
        const viewportHeight = window.innerHeight;
        
        // Calculate remaining space below the importer/builder in current viewport
        const remainingSpaceInViewport = viewportHeight - importerRect.bottom;
        
        const minRequiredSpace = 100;
        
        if (remainingSpaceInViewport < minRequiredSpace) {
          // Not enough space, add minimal padding and remember we need extra scroll
          setExtraScrollPadding(true);
          needsExtraScrollRef.current = true;
          
          // Wait for padding to render
          setTimeout(() => {
            // Scroll down by just 30px
            window.scrollTo({
              top: scrollTop + 30,
              behavior: 'smooth'
            });
            
            // Wait for scroll to complete, then calculate position and show loader
            setTimeout(() => {
              const newImporterRect = importerRef.current!.getBoundingClientRect();
              const newScrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const newImporterBottom = newImporterRect.bottom + newScrollTop;
              const newRemainingSpace = viewportHeight - newImporterRect.bottom;
              
              // Position loader in middle of new remaining space
              const loaderPos = newImporterBottom + (newRemainingSpace / 2);
              setLoaderPosition({ top: `${loaderPos}px` });
              setShowLoader(true);
            }, 300);
          }, 50);
        } else {
          // Enough space exists, position loader in middle of remaining space
          const middleOfRemainingSpace = importerBottom + (remainingSpaceInViewport / 2);
          setLoaderPosition({ top: `${middleOfRemainingSpace}px` });
          setShowLoader(true);
        }
      }
    }, 0);
    
    // Simulate evaluation time
    const loadingTime = 2200 + Math.random() * 1000;
    setTimeout(() => {
      setIsEvaluating(false);
      setShowLoader(false);
      
      // Wait for content to fully render before scrolling
      setTimeout(() => {
        setExtraScrollPadding(false);
        const scrollOffset = needsExtraScrollRef.current ? -50 : -20;
        smoothScrollTo(archetypeRef.current, 1500, scrollOffset);
      }, 200);
    }, loadingTime);
  };

  const handleEditTeam = () => {
    // Reset evaluation state when going back to edit
    setHasEvaluated(false);
    
    // Export current team to text format
    if (team) {
      const teamText = exportShowdownTeam(team);
      setEditTeamText(teamText);
    }
    
    // Scroll back to the importer/builder
    smoothScrollTo(importerRef.current, 1500, 0);
  };

  const handleExportTeam = () => {
    openExportModal();
  };

  return (
    <Box className="vh-100" style={{ position: 'relative' }}>
      <Box 
        className="vh-100 initial-viewport"
        style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Container size="sm" style={{ width: '100%' }}>
          <Stack gap="xl">
            <Center>
              <Stack gap="xs" align="center">
                <Title order={1} ta="center" className="responsive-title" style={{ color: 'white' }}>
                  Pokemon Team Evaluator
                </Title>
                <Text ta="center" className="responsive-subtitle" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
                onExport={(exportTeam) => {
                  setTeam(exportTeam);
                  openExportModal();
                }}
                editTeamText={editTeamText}
                onEditComplete={() => setEditTeamText('')}
              />
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Extra padding when evaluating from builder */}
      {extraScrollPadding && (
        <Box style={{ height: '30px' }} />
      )}

      {/* Loader */}
      {isEvaluating && showLoader && (
        <Box 
          style={{ 
            position: 'absolute',
            top: loaderPosition.top,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
        <Box
          style={{
            width: '12px',
            height: '12px',
            backgroundColor: 'white',
            borderRadius: '50%',
            animation: 'ripple-loader 1.5s ease-out infinite',
          }}
        />
        </Box>
      )}
      
      {team && teamAnalysis && hasEvaluated && (
        <Container 
          size="xl" 
          py="xl"
          style={{ 
            opacity: isEvaluating ? 0 : 1,
            pointerEvents: isEvaluating ? 'none' : 'auto',
            transition: 'opacity 0.3s ease-in-out'
          }}
        >
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
          size={isMobile ? "100%" : "md"}
          fullScreen={isMobile}
          styles={{
            body: { 
              display: 'flex', 
              flexDirection: 'column',
              height: isMobile ? 'calc(100% - 60px)' : '80vh',
              minHeight: '500px',
              padding: isMobile ? '16px' : '24px'
            },
            content: {
              height: isMobile ? '100%' : '90vh',
              maxHeight: isMobile ? '100%' : '90vh'
            }
          }}
        >
          <Stack style={{ flex: 1, height: '100%' }} gap="md">
            <Box style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
              <Textarea
                value={exportShowdownTeam(team)}
                readOnly
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: isMobile ? '11px' : '13px',
                    lineHeight: '1.4',
                    height: '100%',
                    minHeight: '400px',
                    width: '100%'
                  },
                  wrapper: {
                    height: '100%',
                    width: '100%'
                  },
                  root: {
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }
                }}
                style={{ width: '100%' }}
                autosize={false}
              />
            </Box>
            <Button
              fullWidth
              leftSection={copiedExport ? <IconCheck size={16} /> : <IconCopy size={16} />}
              color={copiedExport ? 'green' : 'blue'}
              onClick={() => {
                navigator.clipboard.writeText(exportShowdownTeam(team));
                setCopiedExport(true);
                setTimeout(() => setCopiedExport(false), 2000);
              }}
              style={{ flexShrink: 0 }}
            >
              {copiedExport ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </Stack>
        </Modal>
      )}
    </Box>
  );
}

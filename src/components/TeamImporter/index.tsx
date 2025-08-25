'use client';

import { useState, useEffect } from 'react';
import { 
  Paper, 
  Tabs, 
  Textarea, 
  Button, 
  Group, 
  Text,
  Stack,
  Alert,
  Select,
  Title,
  Box,
  Center,
  Tooltip,
  ActionIcon
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconFileImport, IconPokeball, IconSparkles, IconQuestionMark } from '@tabler/icons-react';
import { Team } from '@/types';
import { parseFullTeam, validateTeamSize } from '@/lib/pokemon/team-parser';
import { FormatId, FORMATS } from '@/lib/pokemon/formats';
import { TeamBuilder } from '@/components/TeamBuilder';

interface TeamImporterProps {
  format: FormatId;
  onFormatChange: (format: FormatId) => void;
  onTeamImport: (team: Team) => void;
  onEvaluate?: () => void;
  onExport?: (team: Team) => void;
  editTeamText?: string;
  onEditComplete?: () => void;
}

export function TeamImporter({ 
  format, 
  onFormatChange, 
  onTeamImport, 
  onEvaluate, 
  onExport,
  editTeamText,
  onEditComplete
}: TeamImporterProps) {
  const isMobile = useMediaQuery('(max-width: 768px)', undefined, {
    getInitialValueInEffect: true,
  });
  const isSmallScreen = useMediaQuery('(max-height: 700px)', undefined, {
    getInitialValueInEffect: true,
  });
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [buildingTeam, setBuildingTeam] = useState<Team | undefined>(undefined);

  useEffect(() => {
    if (editTeamText) {
      setImportText(editTeamText);
      // Clear the edit text after using it
      if (onEditComplete) {
        onEditComplete();
      }
    }
  }, [editTeamText, onEditComplete]);
  
  const formatOptions = Object.entries(FORMATS).map(([id, format]) => ({
    value: id,
    label: format.name,
  }));

  const handleImport = () => {
    setError(null);
    
    try {
      const team = parseFullTeam(importText);
      
      if (team.pokemon.length === 0) {
        setError('No valid Pokemon found in the import text');
        return;
      }
      
      if (!validateTeamSize(team)) {
        setError('Team must have 1-6 Pokemon');
        return;
      }
      
      // Update team format
      team.format = format;
      
      onTeamImport(team);
      setImportText('');
      
      if (onEvaluate) {
        onEvaluate();
      }
    } catch (err) {
      setError('Failed to parse team. Please check the format.');
    }
  };

  const handleTeamUpdate = (team: Team) => {
    setBuildingTeam(team);
    if (team.pokemon.some(p => p.species)) {
      onTeamImport(team);
    }
  };

  const sampleTeam = `

Samurott-Hisui (F) @ Assault Vest  
Ability: Sharpness  
Tera Type: Poison  
EVs: 160 HP / 76 Atk / 172 SpD / 100 Spe  
Adamant Nature  
- Ceaseless Edge  
- Razor Shell  
- Sucker Punch  
- Knock Off  

Tornadus-Therian @ Life Orb  
Ability: Regenerator  
Tera Type: Steel  
EVs: 16 Def / 252 SpA / 240 Spe  
Timid Nature  
IVs: 0 Atk  
- Nasty Plot  
- Bleakwind Storm  
- Heat Wave  
- Grass Knot  

Pecharunt @ Heavy-Duty Boots  
Ability: Poison Puppeteer  
Tera Type: Dark  
EVs: 252 HP / 212 Def / 12 SpD / 32 Spe  
Bold Nature  
IVs: 0 Atk  
- Malignant Chain  
- Foul Play  
- Recover  
- Parting Shot  

Great Tusk @ Heavy-Duty Boots  
Ability: Protosynthesis  
Tera Type: Ground  
EVs: 144 HP / 112 Atk / 252 Spe  
Jolly Nature  
- Stealth Rock  
- Headlong Rush  
- Knock Off  
- Rapid Spin  

Clefable @ Leftovers  
Ability: Magic Guard  
Tera Type: Water  
EVs: 252 HP / 192 Def / 64 Spe  
Bold Nature  
IVs: 0 Atk  
- Calm Mind  
- Moonblast  
- Flamethrower  
- Moonlight  

Zamazenta @ Assault Vest  
Ability: Dauntless Shield  
Tera Type: Steel  
EVs: 252 Atk / 4 SpD / 252 Spe  
Jolly Nature  
- Close Combat  
- Crunch  
- Stone Edge  
- Heavy Slam`;


  return (
    <Paper shadow="sm" radius="md" className="team-importer-paper top-level-card">
      <Stack className="team-importer-stack">
        {/* Format selector */}
        <Stack gap="xs" align="center">
          <Group gap={6} align="center" wrap="nowrap">
            <Title order={4} className="responsive-format-title" style={{ margin: 0 }}>Select Format</Title>
            <Tooltip 
              label="Smogon Metagame format" 
              position="top"
              openDelay={0}
              closeDelay={0}
              events={{ hover: true, focus: true, touch: true }}
            >
              <Box style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: 2 }}>
                <ActionIcon 
                  variant="filled" 
                  size={14}
                  radius="xl"
                  color="gray.6"
                  style={{ width: 14, height: 14, minWidth: 14, minHeight: 14 }}
                >
                  <IconQuestionMark size={10} stroke={2.5} />
                </ActionIcon>
              </Box>
            </Tooltip>
          </Group>
          <Select
            value={format}
            onChange={(val) => val && onFormatChange(val as FormatId)}
            data={formatOptions}
            size="md"
            className="format-select"
            style={{ width: '100%', maxWidth: '250px' }}
          />
        </Stack>

        {/* Team import tabs */}
        <Tabs defaultValue="paste">
          <Center>
            <Tabs.List className="team-tabs-list" grow={isMobile}>
              <Tabs.Tab 
                value="paste" 
                leftSection={<IconFileImport size={14} />}
                className="team-tab"
              >
                Paste from Showdown
              </Tabs.Tab>
              <Tabs.Tab 
                value="build" 
                leftSection={<IconPokeball size={14} />}
                className="team-tab"
              >
                Build Team
              </Tabs.Tab>
            </Tabs.List>
          </Center>

          <Tabs.Panel value="paste" pt="sm">
            <Stack gap="xs">
              <Center>
                <Textarea
                  placeholder="Paste your Pokemon Showdown team here..."
                  value={importText}
                  onChange={(e) => setImportText(e.currentTarget.value)}
                  className="team-import-textarea"
                  styles={{
                    input: { 
                      fontFamily: 'monospace',
                      lineHeight: '1.3',
                    }
                  }}
                />
              </Center>
              
              {error && (
                <Center>
                  <Alert 
                    color="red" 
                    title="Import Error" 
                    className="import-error-alert"
                  >
                    {error}
                  </Alert>
                </Center>
              )}
              
              <Center>
                <Group 
                  justify="space-between" 
                  className="import-button-group"
                >
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setImportText(sampleTeam)}
                  >
                    Use Sample Team
                  </Button>
                  
                  <Button
                    leftSection={<IconSparkles size={16} />}
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    variant="filled"
                    className="evaluate-button"
                  >
                    Evaluate
                  </Button>
                </Group>
              </Center>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="build" pt="sm">
            <Stack>
              <TeamBuilder 
                format={format}
                initialTeam={buildingTeam}
                onTeamUpdate={handleTeamUpdate}
                onExport={onExport}
              />
              {buildingTeam && buildingTeam.pokemon.some(p => p.species) && onEvaluate && (
                <Group justify="flex-end">
                  <Button
                    leftSection={<IconSparkles size={16} />}
                    onClick={onEvaluate}
                    variant="filled"
                    className="evaluate-button"
                  >
                    Evaluate
                  </Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
}
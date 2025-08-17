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
  Center
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconFileImport, IconPokeball, IconSparkles } from '@tabler/icons-react';
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

  const sampleTeam = `Garchomp @ Loaded Dice
Ability: Rough Skin
Level: 100
Tera Type: Steel
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- Scale Shot
- Iron Head
- Protect

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 100
Tera Type: Fire
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- U-turn
- Knock Off

Amoonguss @ Sitrus Berry
Ability: Regenerator
Level: 100
Tera Type: Water
EVs: 252 HP / 116 Def / 140 SpD
Calm Nature
IVs: 0 Atk
- Spore
- Rage Powder
- Pollen Puff
- Protect

Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 100
Tera Type: Flying
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
IVs: 0 Atk
- Shadow Ball
- Make It Rain
- Thunderbolt
- Trick

Urshifu-Rapid-Strike @ Focus Sash
Ability: Unseen Fist
Level: 100
Tera Type: Poison
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Protect

Flutter Mane @ Choice Scarf
Ability: Protosynthesis
Level: 100
Tera Type: Fairy
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
IVs: 0 Atk
- Moonblast
- Shadow Ball
- Dazzling Gleam
- Thunderbolt`;


  return (
    <Paper shadow="sm" radius="md" className="team-importer-paper">
      <Stack className="team-importer-stack">
        {/* Format selector */}
        <Stack gap="xs" align="center">
          <Title order={4} className="responsive-format-title">Select Format</Title>
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
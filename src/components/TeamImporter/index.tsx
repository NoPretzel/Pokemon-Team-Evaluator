'use client';

import { useState } from 'react';
import { 
  Paper, 
  Tabs, 
  Textarea, 
  Button, 
  Group, 
  Text,
  Stack,
  Alert,
  SegmentedControl,
  Select,
  Title,
  Box,
  Center
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconFileImport, IconPokeball, IconChartBar } from '@tabler/icons-react';
import { Team } from '@/types';
import { parseFullTeam, validateTeamSize } from '@/lib/pokemon/team-parser';
import { FormatId, FORMATS } from '@/lib/pokemon/formats';
import { TeamBuilder } from '@/components/TeamBuilder';

interface TeamImporterProps {
  format: FormatId;
  onFormatChange: (format: FormatId) => void;
  onTeamImport: (team: Team) => void;
  onEvaluate?: () => void;
}

export function TeamImporter({ format, onFormatChange, onTeamImport, onEvaluate }: TeamImporterProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [buildingTeam, setBuildingTeam] = useState<Team | undefined>(undefined);
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
Level: 50
Tera Type: Steel
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- Scale Shot
- Iron Head
- Protect

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
Tera Type: Fire
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- U-turn
- Knock Off

Amoonguss @ Sitrus Berry
Ability: Regenerator
Level: 50
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
Level: 50
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
Level: 50
Tera Type: Poison
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Protect

Flutter Mane @ Choice Scarf
Ability: Protosynthesis
Level: 50
Tera Type: Fairy
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
IVs: 0 Atk
- Moonblast
- Shadow Ball
- Dazzling Gleam
- Thunderbolt`;

  return (
    <Paper shadow="sm" radius="md" p="lg">
      <Stack gap="md">
        {/* Format selector */}
        <Box>
          <Title order={4} mb="xs" ta="center">Select Format</Title>
          <Center>
            {isMobile ? (
              <Select
                value={format}
                onChange={(val) => val && onFormatChange(val as FormatId)}
                data={formatOptions}
                style={{ width: '100%', maxWidth: 300 }}
              />
            ) : (
              <SegmentedControl
                value={format}
                onChange={(val) => onFormatChange(val as FormatId)}
                data={formatOptions}
                size="md"
              />
            )}
          </Center>
        </Box>

        {/* Team import tabs */}
        <Tabs defaultValue="paste">
          <Center>
            <Tabs.List style={{ flexWrap: 'nowrap' }}>
              <Tabs.Tab 
                value="paste" 
                leftSection={<IconFileImport size={16} />}
                style={{ whiteSpace: 'nowrap' }}
              >
                Paste from Showdown
              </Tabs.Tab>
              <Tabs.Tab 
                value="build" 
                leftSection={<IconPokeball size={16} />}
                style={{ whiteSpace: 'nowrap' }}
              >
                Build Team
              </Tabs.Tab>
            </Tabs.List>
          </Center>

          <Tabs.Panel value="paste" pt="md">
            <Stack>
              <Center>
                <Textarea
                  placeholder="Paste your Pokemon Showdown team here..."
                  minRows={15}
                  maxRows={25}
                  value={importText}
                  onChange={(e) => setImportText(e.currentTarget.value)}
                  styles={{
                    input: { 
                      fontFamily: 'monospace',
                      fontSize: '13px',
                    }
                  }}
                  w={{ base: '100%', md: '600px' }}
                />
              </Center>
              
              {error && (
                <Center>
                  <Alert color="red" title="Import Error" w={{ base: '100%', md: '600px' }}>
                    {error}
                  </Alert>
                </Center>
              )}
              
              <Center>
                <Group justify="space-between" w={{ base: '100%', md: '600px' }}>
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setImportText(sampleTeam)}
                  >
                    Use Sample Team
                  </Button>
                  
                  <Button
                    leftSection={<IconChartBar size={16} />}
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    variant="filled"
                  >
                    Evaluate
                  </Button>
                </Group>
              </Center>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="build" pt="md">
            <Stack>
              <TeamBuilder 
                format={format}
                initialTeam={buildingTeam}
                onTeamUpdate={handleTeamUpdate}
              />
              {buildingTeam && buildingTeam.pokemon.some(p => p.species) && onEvaluate && (
                <Group justify="flex-end">
                  <Button
                    leftSection={<IconChartBar size={16} />}
                    onClick={onEvaluate}
                    variant="filled"
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
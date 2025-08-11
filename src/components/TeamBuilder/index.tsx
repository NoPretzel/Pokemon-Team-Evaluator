import { useState, useMemo, useEffect } from 'react';
import {
  Stack,
  Grid,
  Card,
  Text,
  Button,
  Group,
  Select,
  Badge,
  ActionIcon,
  Tooltip,
  Paper,
  Box,
  Center,
  Modal,
  Textarea,
  SimpleGrid,
  NumberInput,
  ScrollArea
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconFileExport,
  IconDice3,
  IconWand
} from '@tabler/icons-react';
import { Team, Pokemon } from '@/types';
import { FormatId } from '@/lib/pokemon/formats';
import { getPokemonData, getMoveData } from '@/lib/pokemon/data-service';
import { PokemonSprite } from '@/components/common/PokemonSprite';
import { StatsTable } from '@smogon/calc';
import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { exportShowdownTeam } from '@/lib/pokemon/team-parser';
import { useDisclosure } from '@mantine/hooks';

const dex = Dex;
const gens = new Generations(Dex);
const gen = gens.get(9); // Gen 9 for current games

interface TeamBuilderProps {
  format: FormatId;
  initialTeam?: Team;
  onTeamUpdate: (team: Team) => void;
}

interface PokemonBuilderProps {
  pokemon: Pokemon;
  index: number;
  format: FormatId;
  onUpdate: (pokemon: Pokemon) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

const NATURES = [
  'Adamant', 'Bold', 'Brave', 'Calm', 'Careful', 'Gentle',
  'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely',
  'Mild', 'Modest', 'Naive', 'Naughty', 'Quiet', 'Quirky',
  'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid'
];

const STAT_NAMES: Record<keyof StatsTable, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe'
};

const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A878',
  Fire: '#F08030',
  Water: '#6890F0',
  Electric: '#F8D030',
  Grass: '#78C850',
  Ice: '#98D8D8',
  Fighting: '#C03028',
  Poison: '#A040A0',
  Ground: '#E0C068',
  Flying: '#A890F0',
  Psychic: '#F85888',
  Bug: '#A8B820',
  Rock: '#B8A038',
  Ghost: '#705898',
  Dragon: '#7038F8',
  Dark: '#705848',
  Steel: '#B8B8D0',
  Fairy: '#EE99AC',
};

const COMMON_SPREADS = [
  { name: 'Phys Sweep', evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 } },
  { name: 'Spec Sweep', evs: { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 } },
  { name: 'Phys Tank', evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 } },
  { name: 'Spec Tank', evs: { hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0 } },
  { name: 'Phys Wall', evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 } },
  { name: 'Spec Wall', evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 } },
];

function getDefaultPokemon(): Pokemon {
  return {
    species: '',
    ability: '',
    item: '',
    nature: 'Adamant',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: [],
    level: 50,
    teraType: undefined
  };
}

function PokemonBuilder({ pokemon, index, format, onUpdate, onRemove, onDuplicate }: PokemonBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [moveSearchQueries, setMoveSearchQueries] = useState(['', '', '', '']);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const pokemonData = useMemo(() => {
    if (!pokemon.species) return null;
    return getPokemonData(pokemon.species);
  }, [pokemon.species]);

  const availablePokemon = useMemo(() => {
    const allSpecies = dex.species.all()
      .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal')
      .map(s => ({ value: s.name, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    let results = allSpecies;
    
    if (searchQuery) {
      results = allSpecies.filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (pokemon.species && !results.find(p => p.value === pokemon.species)) {
      results.unshift({ value: pokemon.species as any, label: pokemon.species as any });
    }
    
    return results.slice(0, 100);
  }, [searchQuery, pokemon.species]);

  const availableAbilities = useMemo(() => {
    if (!pokemonData) return [];
    return pokemonData.abilities.map(a => ({ value: a, label: a }));
  }, [pokemonData]);

  const availableItems = useMemo(() => {
    return dex.items.all()
      .filter(i => i.exists && !i.isNonstandard)
      .map(i => ({ value: i.name, label: i.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const availableTypes = Object.keys(TYPE_COLORS).map(type => ({
    value: type,
    label: type
  }));

  const getAvailableMoves = (searchQuery: string) => {
    if (!pokemon.species) return [];
    
    try {
      const species = dex.species.get(pokemon.species);
      if (!species || !species.exists) {
        return [];
      }
      
      let learnableMoves: { value: string; label: string }[] = [];
      
      const speciesId = species.id;
      const learnsetData = gen.learnsets.get(speciesId as any);
      
      if (learnsetData && typeof learnsetData === 'object' && 'learnset' in learnsetData) {
        const learnset = (learnsetData as any).learnset;
        const moveIds = Object.keys(learnset);
        
        learnableMoves = moveIds.map(moveId => {
          const move = dex.moves.get(moveId);
          if (!move || !move.exists || move.isNonstandard) return null;
          if (move.isZ || move.isMax) return null;
          
          return { value: move.name, label: move.name };
        }).filter(Boolean) as { value: string; label: string }[];
      } else {
        const allMoves = dex.moves.all()
          .filter(m => m.exists && !m.isNonstandard && m.num > 0);
        
        learnableMoves = allMoves
          .filter(move => {
            if (move.isZ || move.isMax) return false;
            if (move.type === 'Normal' || move.category === 'Status') return true;
            if (pokemonData && pokemonData.types.includes(move.type)) return true;
            
            const commonCoverage = ['Hidden Power', 'Return', 'Frustration', 'Protect', 'Substitute', 'Toxic', 'Rest', 'Sleep Talk'];
            if (commonCoverage.includes(move.name)) return true;
            
            const signatureMoves = ['Sacred Fire', 'Aeroblast', 'Spacial Rend', 'Roar of Time', 'Shadow Force', 'Crush Grip', 'Magma Storm', 'Dark Void', 'Seed Flare', 'Judgment', 'V-create', 'Blue Flare', 'Bolt Strike', 'Glaciate', 'Fusion Flare', 'Fusion Bolt', 'Ice Burn', 'Freeze Shock', 'Secret Sword', 'Relic Song', 'Techno Blast', 'Geomancy', 'Oblivion Wing', 'Land\'s Wrath', 'Thousand Arrows', 'Thousand Waves', 'Core Enforcer', 'Diamond Storm', 'Hyperspace Hole', 'Hyperspace Fury', 'Steam Eruption', 'Prismatic Laser', 'Sunsteel Strike', 'Moongeist Beam', 'Nature\'s Madness', 'Multi-Attack', 'Mind Blown', 'Plasma Fists', 'Photon Geyser', 'Light That Burns the Sky', 'Searing Sunraze Smash', 'Menacing Moonraze Maelstrom'];
            if (signatureMoves.includes(move.name)) return false;
            
            if (pokemon.species === 'Abomasnow' && move.type === 'Fire') return false;
            
            return false;
          })
          .map(m => ({ value: m.name, label: m.name }));
      }

      learnableMoves.sort((a, b) => a.label.localeCompare(b.label));

      if (!searchQuery) return learnableMoves.slice(0, 100);
      
      return learnableMoves
        .filter(m => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 100);
    } catch (error) {
      const basicMoves = [
        'Tackle', 'Scratch', 'Pound', 'Protect', 'Substitute', 'Toxic', 'Rest', 'Sleep Talk',
        'Return', 'Frustration', 'Hidden Power', 'Double Team', 'Swagger', 'Attract'
      ].map(m => ({ value: m, label: m }));
      
      return basicMoves;
    }
  };

  const updateEv = (stat: keyof StatsTable, value: number | string) => {
    const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
    const newEvs = { ...pokemon.evs, [stat]: Math.min(252, Math.max(0, numValue)) };
    
    // Ensure total EVs don't exceed 508
    const total = Object.values(newEvs).reduce((sum, ev) => sum + ev, 0);
    if (total > 508) {
      const excess = total - 508;
      newEvs[stat] = Math.max(0, numValue - excess);
    }
    
    onUpdate({ ...pokemon, evs: newEvs });
  };

  const updateMove = (index: number, value: string | null) => {
    const newMoves = [...pokemon.moves];
    if (value) {
      newMoves[index] = value;
    } else {
      newMoves.splice(index, 1);
    }
    onUpdate({ ...pokemon, moves: newMoves });
  };

  const applySpread = (spread: typeof COMMON_SPREADS[0]) => {
    onUpdate({ ...pokemon, evs: spread.evs });
  };

  const randomizePokemon = () => {
    const randomSpecies = dex.species.all()
      .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal')
      .sort(() => Math.random() - 0.5)
      .slice(0, 1)[0];
    
    if (!randomSpecies) return;

    const speciesData = getPokemonData(randomSpecies.name);
    if (!speciesData) return;

    const randomAbility = speciesData.abilities[Math.floor(Math.random() * speciesData.abilities.length)];
    const randomNature = NATURES[Math.floor(Math.random() * NATURES.length)];
    const randomItem = dex.items.all()
      .filter(i => i.exists && !i.isNonstandard)
      .sort(() => Math.random() - 0.5)
      .slice(0, 1)[0]?.name || '';

    const availableMoves = getAvailableMoves('');
    const randomMoves: string[] = [];
    const shuffledMoves = availableMoves.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < 4 && i < shuffledMoves.length; i++) {
      if (shuffledMoves[i]) {
        randomMoves.push(shuffledMoves[i].value);
      }
    }

    const randomSpread = COMMON_SPREADS[Math.floor(Math.random() * COMMON_SPREADS.length)];
    const randomTeraType = Math.random() > 0.5 ? 
      availableTypes[Math.floor(Math.random() * availableTypes.length)].value : 
      undefined;

    onUpdate({
      ...pokemon,
      species: randomSpecies.name,
      ability: randomAbility,
      item: randomItem,
      nature: randomNature,
      evs: randomSpread.evs,
      moves: randomMoves,
      teraType: randomTeraType,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      level: 50
    });
  };

  const totalEvs = Object.values(pokemon.evs).reduce((sum, ev) => sum + ev, 0);

  return (
    <Card shadow="sm" radius="md" withBorder p="sm">
      <Stack gap="sm">
        {/* Header Row */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            {pokemon.species && (
              <PokemonSprite species={pokemon.species} className="w-10 h-10 flex-shrink-0" />
            )}
            <Select
              placeholder="Choose Pokemon"
              data={availablePokemon}
              value={pokemon.species || null}
              onChange={(value) => {
                onUpdate({ ...pokemon, species: value || '', ability: '', moves: [] });
              }}
              searchable
              onSearchChange={setSearchQuery}
              w={isMobile ? '100%' : 200}
              size="sm"
              style={{ flex: isMobile ? 1 : 'initial' }}
              clearable
              key={`pokemon-select-${index}-${pokemon.species}`}
            />
            {!isMobile && pokemonData && (
              <Group gap={4}>
                {pokemonData.types.map(type => (
                  <Badge
                    key={type}
                    size="xs"
                    style={{
                      backgroundColor: TYPE_COLORS[type],
                      color: 'white'
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </Group>
            )}
          </Group>
          <Group gap={4} style={{ flexShrink: 0 }}>
            <Tooltip label="Randomize">
              <ActionIcon size="sm" variant="subtle" color="violet" onClick={randomizePokemon}>
                <IconDice3 size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Duplicate">
              <ActionIcon size="sm" variant="subtle" onClick={onDuplicate} disabled={!pokemon.species}>
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Remove">
              <ActionIcon size="sm" variant="subtle" color="red" onClick={onRemove}>
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Show types on mobile below the header */}
        {isMobile && pokemonData && (
          <Group gap={4}>
            {pokemonData.types.map(type => (
              <Badge
                key={type}
                size="xs"
                style={{
                  backgroundColor: TYPE_COLORS[type],
                  color: 'white'
                }}
              >
                {type}
              </Badge>
            ))}
          </Group>
        )}

        {/* Main Content Grid */}
        <Grid gutter="xs">
          {/* Left Column - Basic Info */}
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Stack gap="xs">
              <Group gap="xs" grow>
                <Select
                  placeholder="Ability"
                  data={availableAbilities}
                  value={pokemon.ability}
                  onChange={(value) => onUpdate({ ...pokemon, ability: value || '' })}
                  disabled={!pokemon.species}
                  size="xs"
                />
                <Select
                  placeholder="Item"
                  data={availableItems}
                  value={pokemon.item}
                  onChange={(value) => onUpdate({ ...pokemon, item: value || '' })}
                  searchable
                  size="xs"
                />
              </Group>
              
              <Group gap="xs" grow>
                <Select
                  placeholder="Nature"
                  data={NATURES}
                  value={pokemon.nature}
                  onChange={(value) => onUpdate({ ...pokemon, nature: value || 'Adamant' })}
                  size="xs"
                />
                <Select
                  placeholder="Tera Type"
                  data={availableTypes}
                  value={pokemon.teraType || ''}
                  onChange={(value) => onUpdate({ ...pokemon, teraType: value || undefined })}
                  clearable
                  size="xs"
                />
              </Group>

              {/* Moves */}
              <Box>
                <Text size="xs" fw={500} mb={4}>Moves</Text>
                <Stack gap={4}>
                  {[0, 1, 2, 3].map((i) => (
                    <Select
                      key={i}
                      placeholder={`Move ${i + 1}`}
                      data={getAvailableMoves(moveSearchQueries[i])}
                      value={pokemon.moves[i] || ''}
                      onChange={(value) => updateMove(i, value)}
                      searchable
                      onSearchChange={(query) => {
                        const newQueries = [...moveSearchQueries];
                        newQueries[i] = query;
                        setMoveSearchQueries(newQueries);
                      }}
                      disabled={!pokemon.species}
                      size="xs"
                      clearable
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid.Col>

          {/* Right Column - EVs */}
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={500}>EVs ({totalEvs}/508)</Text>
                <Select
                  placeholder="Spread"
                  data={COMMON_SPREADS.map(s => ({ value: s.name, label: s.name }))}
                  onChange={(value) => {
                    const spread = COMMON_SPREADS.find(s => s.name === value);
                    if (spread) applySpread(spread);
                  }}
                  clearable
                  size="xs"
                  w={100}
                />
              </Group>
              
              <SimpleGrid cols={3} spacing={4}>
                {(Object.keys(STAT_NAMES) as Array<keyof StatsTable>).map((stat) => (
                  <NumberInput
                    key={stat}
                    label={STAT_NAMES[stat]}
                    value={pokemon.evs[stat]}
                    onChange={(value) => updateEv(stat, value)}
                    min={0}
                    max={252}
                    step={4}
                    size="xs"
                    styles={{
                      label: { fontSize: 11, marginBottom: 2 },
                      input: { textAlign: 'center', padding: '0 4px' }
                    }}
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  );
}

export function TeamBuilder({ format, initialTeam, onTeamUpdate }: TeamBuilderProps) {
  const [team, setTeam] = useState<Team>(
    initialTeam || { format, pokemon: [getDefaultPokemon()] }
  );
  const [showExportModal, { open: openExportModal, close: closeExportModal }] = useDisclosure(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const updatePokemon = (index: number, pokemon: Pokemon) => {
    const newTeam = {
      ...team,
      pokemon: team.pokemon.map((p, i) => i === index ? pokemon : p)
    };
    setTeam(newTeam);
    onTeamUpdate(newTeam);
  };

  const addPokemon = () => {
    if (team.pokemon.length >= 6) return;
    
    const newTeam = {
      ...team,
      pokemon: [...team.pokemon, getDefaultPokemon()]
    };
    setTeam(newTeam);
    onTeamUpdate(newTeam);
  };

  const removePokemon = (index: number) => {
    const newTeam = {
      ...team,
      pokemon: team.pokemon.filter((_, i) => i !== index)
    };
    setTeam(newTeam);
    onTeamUpdate(newTeam);
  };

  const duplicatePokemon = (index: number) => {
    if (team.pokemon.length >= 6) return;
    
    const pokemonToDuplicate = { ...team.pokemon[index] };
    const newTeam = {
      ...team,
      pokemon: [...team.pokemon, pokemonToDuplicate]
    };
    setTeam(newTeam);
    onTeamUpdate(newTeam);
  };

  const randomizeTeam = () => {
    const randomPokemon: Pokemon[] = [];
    const existingValidCount = team.pokemon.filter(p => p.species).length;
    const numToGenerate = Math.min(6 - existingValidCount, 6);
    
    // Generate new random Pokemon
    for (let i = 0; i < numToGenerate; i++) {
      const randomSpecies = dex.species.all()
        .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal')
        .sort(() => Math.random() - 0.5)[0];
      
      if (!randomSpecies) continue;

      const speciesData = getPokemonData(randomSpecies.name);
      if (!speciesData) continue;

      const randomAbility = speciesData.abilities[Math.floor(Math.random() * speciesData.abilities.length)];
      const randomNature = NATURES[Math.floor(Math.random() * NATURES.length)];
      const randomItem = dex.items.all()
        .filter(i => i.exists && !i.isNonstandard)
        .sort(() => Math.random() - 0.5)[0]?.name || '';

      // Get random moves
      const allMoves = dex.moves.all()
        .filter(m => m.exists && !m.isNonstandard && m.basePower > 0 && !m.isZ && !m.isMax)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      
      const randomMoves: string[] = [];
      for (let j = 0; j < 4 && j < allMoves.length; j++) {
        if (allMoves[j]) {
          randomMoves.push(allMoves[j].name);
        }
      }

      const randomSpread = COMMON_SPREADS[Math.floor(Math.random() * COMMON_SPREADS.length)];
      const randomTeraType = Math.random() > 0.5 ? 
        Object.keys(TYPE_COLORS)[Math.floor(Math.random() * Object.keys(TYPE_COLORS).length)] : 
        undefined;
      
      randomPokemon.push({
        species: randomSpecies.name,
        ability: randomAbility,
        item: randomItem,
        nature: randomNature,
        evs: randomSpread.evs,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: randomMoves,
        level: 50,
        teraType: randomTeraType
      });
    }
    
    // Keep existing valid Pokemon and add new ones
    const existingValidPokemon = team.pokemon.filter(p => p.species);
    const newPokemon = [...existingValidPokemon, ...randomPokemon].slice(0, 6);
    
    const newTeam = {
      ...team,
      pokemon: newPokemon
    };
    
    setTeam(newTeam);
    onTeamUpdate(newTeam);
  };

  const exportTeam = () => {
    return exportShowdownTeam(team);
  };

  const validPokemon = team.pokemon.filter(p => p.species).length;

  return (
    <>
      <Stack gap="md">
        {/* Team Controls */}
        <Paper withBorder p="sm">
          <Group justify="space-between">
            <Group>
              <Text fw={600} size="sm">Team Builder</Text>
              <Badge size="sm" variant="filled">
                {validPokemon}/6 Pokemon
              </Badge>
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDice3 size={14} />}
                onClick={randomizeTeam}
              >
                Random
              </Button>
              <Button
                size="xs"
                leftSection={<IconFileExport size={14} />}
                onClick={openExportModal}
                disabled={validPokemon === 0}
              >
                Export
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Pokemon List */}
        <Stack gap="sm">
          {team.pokemon.map((pokemon, index) => (
            <PokemonBuilder
              key={index}
              pokemon={pokemon}
              index={index}
              format={format}
              onUpdate={(p) => updatePokemon(index, p)}
              onRemove={() => removePokemon(index)}
              onDuplicate={() => duplicatePokemon(index)}
            />
          ))}
        </Stack>

        {/* Add Pokemon Button */}
        {team.pokemon.length < 6 && (
          <Center>
            <Button
              size="sm"
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={addPokemon}
            >
              Add Pokemon
            </Button>
          </Center>
        )}
      </Stack>

      {/* Export Modal */}
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
        <Stack>
          <Textarea
            value={exportTeam()}
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
              navigator.clipboard.writeText(exportTeam());
              setCopiedExport(true);
              setTimeout(() => setCopiedExport(false), 2000);
            }}
          >
            {copiedExport ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
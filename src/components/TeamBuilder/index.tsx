import { useState, useMemo } from 'react';
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
  Chip
} from '@mantine/core';
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

  const pokemonData = useMemo(() => {
    if (!pokemon.species) return null;
    return getPokemonData(pokemon.species);
  }, [pokemon.species]);

  // Get all available Pokemon
  const availablePokemon = useMemo(() => {
    const allSpecies = dex.species.all()
      .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal')
      .map(s => ({ value: s.name, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (!searchQuery) return allSpecies.slice(0, 100);
    
    return allSpecies
      .filter(p => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 100);
  }, [searchQuery]);

  // Get available abilities
  const availableAbilities = useMemo(() => {
    if (!pokemonData) return [];
    return pokemonData.abilities.map(a => ({ value: a, label: a }));
  }, [pokemonData]);

  // Get all items
  const availableItems = useMemo(() => {
    return dex.items.all()
      .filter(i => i.exists && !i.isNonstandard)
      .map(i => ({ value: i.name, label: i.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Get available types for Tera
  const availableTypes = Object.keys(TYPE_COLORS).map(type => ({
    value: type,
    label: type
  }));

  // Get available moves
  const getAvailableMoves = (searchQuery: string) => {
    if (!pokemon.species) return [];
    
    try {
      // Get the species for learnset lookup
      const species = dex.species.get(pokemon.species);
      if (!species || !species.exists) {
        console.warn(`Species not found: ${pokemon.species}`);
        return [];
      }
      
      // Debug logging
      console.log(`Looking up learnset for: ${pokemon.species} (ID: ${species.id})`);
      
      // Try to get the learnset for this Pokemon
      let learnset = gen.learnsets.get(species.id);
      
      // Try alternative lookups if primary fails
      if (!learnset) {
        const alternativeIds = [
          species.id.toLowerCase(),
          species.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          species.baseSpecies?.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ].filter(Boolean);
        
        for (const altId of alternativeIds) {
          console.log(`Trying alternative ID: ${altId}`);
          learnset = gen.learnsets.get(altId as any);
          if (learnset) {
            console.log(`Found learnset with ID: ${altId}`);
            break;
          }
        }
      }
      
      let learnableMoves: { value: string; label: string }[] = [];
      
      if (learnset && typeof learnset === 'object') {
        console.log(`Learnset found! Contains ${Object.keys(learnset).length} moves`);
        
        // Extract all learnable moves from learnset
        const moveIds = Object.keys(learnset);
        learnableMoves = moveIds.map(moveId => {
          const move = dex.moves.get(moveId);
          if (!move || !move.exists) return null;
          return { value: move.name, label: move.name };
        }).filter(Boolean) as { value: string; label: string }[];
        
        console.log(`Parsed ${learnableMoves.length} valid moves`);
      } else {
        console.warn(`No learnset found for ${pokemon.species}, falling back to all moves`);
      }
      
      // If no learnset found or empty, show all moves as fallback
      if (learnableMoves.length === 0) {
        learnableMoves = dex.moves.all()
          .filter(m => m.exists && !m.isNonstandard && m.num > 0)
          .map(m => ({ value: m.name, label: m.name }));
      }

      // Sort alphabetically
      learnableMoves.sort((a, b) => a.label.localeCompare(b.label));

      if (!searchQuery) return learnableMoves.slice(0, 100);
      
      return learnableMoves
        .filter(m => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 100);
    } catch (error) {
      console.error('Error getting moves:', error);
      // Fallback to all moves if there's an error
      const allMoves = dex.moves.all()
        .filter(m => m.exists && !m.isNonstandard && m.num > 0)
        .map(m => ({ value: m.name, label: m.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

      if (!searchQuery) return allMoves.slice(0, 100);
      
      return allMoves
        .filter(m => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 100);
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

    // Get random moves from available moves
    const allMoves = dex.moves.all()
      .filter(m => m.exists && !m.isNonstandard && m.basePower > 0)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    
    const randomMoves: string[] = [];
    for (let i = 0; i < 4 && i < allMoves.length; i++) {
      if (allMoves[i]) {
        randomMoves.push(allMoves[i].name);
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
          <Group gap="xs" wrap="nowrap">
            {pokemon.species && (
              <PokemonSprite species={pokemon.species} className="w-10 h-10" />
            )}
            <Select
              placeholder="Choose Pokemon"
              data={availablePokemon}
              value={pokemon.species}
              onChange={(value) => onUpdate({ ...pokemon, species: value || '' })}
              searchable
              onSearchChange={setSearchQuery}
              w={200}
              size="sm"
            />
            {pokemonData && (
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
          <Group gap={4}>
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

        {/* Main Content Grid */}
        <Grid gutter="xs">
          {/* Left Column - Basic Info */}
          <Grid.Col span={6}>
            <Stack gap="xs">
              <Group gap="xs">
                <Select
                  placeholder="Ability"
                  data={availableAbilities}
                  value={pokemon.ability}
                  onChange={(value) => onUpdate({ ...pokemon, ability: value || '' })}
                  disabled={!pokemon.species}
                  size="xs"
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Item"
                  data={availableItems}
                  value={pokemon.item}
                  onChange={(value) => onUpdate({ ...pokemon, item: value || '' })}
                  searchable
                  size="xs"
                  style={{ flex: 1 }}
                />
              </Group>
              
              <Group gap="xs">
                <Select
                  placeholder="Nature"
                  data={NATURES}
                  value={pokemon.nature}
                  onChange={(value) => onUpdate({ ...pokemon, nature: value || 'Adamant' })}
                  size="xs"
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Tera Type"
                  data={availableTypes}
                  value={pokemon.teraType || ''}
                  onChange={(value) => onUpdate({ ...pokemon, teraType: value || undefined })}
                  clearable
                  size="xs"
                  style={{ flex: 1 }}
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
          <Grid.Col span={6}>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={500}>EVs ({totalEvs}/508)</Text>
                <Group gap={4}>
                  {COMMON_SPREADS.slice(0, 3).map((spread) => (
                    <Tooltip key={spread.name} label={spread.name}>
                      <ActionIcon
                        size="xs"
                        variant="light"
                        onClick={() => applySpread(spread)}
                      >
                        {spread.name.charAt(0)}
                      </ActionIcon>
                    </Tooltip>
                  ))}
                </Group>
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
              
              {/* Spread chips */}
              <Group gap={4}>
                {COMMON_SPREADS.slice(3).map((spread) => (
                  <Chip
                    key={spread.name}
                    size="xs"
                    variant="light"
                    checked={false}
                    onClick={() => applySpread(spread)}
                  >
                    {spread.name}
                  </Chip>
                ))}
              </Group>
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
    const numToGenerate = Math.min(6, Math.max(1, 6 - team.pokemon.filter(p => p.species).length));
    
    for (let i = 0; i < numToGenerate; i++) {
      const randomSpecies = dex.species.all()
        .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal')
        .sort(() => Math.random() - 0.5)
        .slice(0, 1)[0];
      
      if (!randomSpecies) continue;

      const speciesData = getPokemonData(randomSpecies.name);
      if (!speciesData) continue;

      const randomAbility = speciesData.abilities[Math.floor(Math.random() * speciesData.abilities.length)];
      const randomNature = NATURES[Math.floor(Math.random() * NATURES.length)];
      const randomItem = dex.items.all()
        .filter(i => i.exists && !i.isNonstandard)
        .sort(() => Math.random() - 0.5)
        .slice(0, 1)[0]?.name || '';

      // Get random moves
      const allMoves = dex.moves.all()
        .filter(m => m.exists && !m.isNonstandard && m.basePower > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      
      const randomMoves: string[] = [];
      for (let j = 0; j < 4 && j < allMoves.length; j++) {
        if (allMoves[j]) {
          randomMoves.push(allMoves[j].name);
        }
      }

      const randomSpread = COMMON_SPREADS[Math.floor(Math.random() * COMMON_SPREADS.length)];
      
      randomPokemon.push({
        species: randomSpecies.name,
        ability: randomAbility,
        item: randomItem,
        nature: randomNature,
        evs: randomSpread.evs,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: randomMoves,
        level: 50,
        teraType: Math.random() > 0.5 ? Object.keys(TYPE_COLORS)[Math.floor(Math.random() * 18)] : undefined
      });
    }
    
    const existingValidPokemon = team.pokemon.filter(p => p.species);
    const newTeam = {
      ...team,
      pokemon: [...existingValidPokemon, ...randomPokemon].slice(0, 6)
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
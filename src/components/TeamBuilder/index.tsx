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
  SimpleGrid,
  NumberInput,
  Flex
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconFileExport,
  IconDice3
} from '@tabler/icons-react';
import { Team, Pokemon } from '@/types';
import { FormatId } from '@/lib/pokemon/formats';
import { getPokemonData } from '@/lib/pokemon/data-service';
import { PokemonSprite } from '@/components/common/PokemonSprite';
import { StatsTable } from '@smogon/calc';
import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';

const dex = Dex;
const gens = new Generations(Dex);
const gen = gens.get(9);

interface TeamBuilderProps {
  format: FormatId;
  initialTeam?: Team;
  onTeamUpdate: (team: Team) => void;
  onExport?: (team: Team) => void;
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
    level: 100,
    teraType: undefined
  };
}

async function getAvailableMovesForSpecies(targetSpecies: string, searchQuery: string = '', currentMove?: string): Promise<{ value: string; label: string }[]> {
  if (!targetSpecies) return [];
  
  const currentMoveOption = currentMove ? [{ value: currentMove, label: currentMove }] : [];
  
  try {
    const species = dex.species.get(targetSpecies);
    if (!species || !species.exists) {
      return currentMoveOption;
    }
    
    let learnableMoves: { value: string; label: string }[] = [];
    
    let speciesId = species.id;
    let learnsetData = await gen.learnsets.get(speciesId as any);
    
    if ((!learnsetData || !learnsetData.learnset) && species.baseSpecies && species.baseSpecies !== species.name) {
      const baseSpecies = dex.species.get(species.baseSpecies);
      if (baseSpecies && baseSpecies.exists) {
        speciesId = baseSpecies.id;
        learnsetData = await gen.learnsets.get(speciesId as any);
      }
    }
    
    if (learnsetData && typeof learnsetData === 'object' && 'learnset' in learnsetData) {
      const learnset = (learnsetData as any).learnset;
      
      if (learnset && typeof learnset === 'object') {
        const moveIds = Object.keys(learnset);
        
        learnableMoves = moveIds.map(moveId => {
          const move = dex.moves.get(moveId);
          if (!move || !move.exists || move.isNonstandard) return null;
          if (move.isZ || move.isMax) return null;
          
          return { value: move.name, label: move.name };
        }).filter(Boolean) as { value: string; label: string }[];
      } else {
        throw new Error(`No valid learnset data for ${targetSpecies}`);
      }
    } else {
      throw new Error(`No learnset data structure for ${targetSpecies}`);
    }

    const sortedMoves = [...learnableMoves].sort((a, b) => a.label.localeCompare(b.label));

    let filteredMoves = sortedMoves;
    if (searchQuery) {
      filteredMoves = sortedMoves.filter(m => 
        m.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (currentMove) {
      filteredMoves = filteredMoves.filter(m => m.value !== currentMove);
      filteredMoves.unshift({ value: currentMove, label: currentMove });
    }

    return filteredMoves.slice(0, 100);
  } catch (error) {
    console.error('Error getting moves for', targetSpecies, ':', error);
    return currentMoveOption || [];
  }
}

async function getMovesForRandomization(targetSpecies: string): Promise<string[]> {
  if (!targetSpecies) return [];
  
  try {
    const species = dex.species.get(targetSpecies);
    if (!species || !species.exists) {
      return [];
    }
    
    let learnableMoves: string[] = [];
    
    let speciesId = species.id;
    let learnsetData = await gen.learnsets.get(speciesId as any);
    
    if ((!learnsetData || !learnsetData.learnset) && species.baseSpecies && species.baseSpecies !== species.name) {
      const baseSpecies = dex.species.get(species.baseSpecies);
      if (baseSpecies && baseSpecies.exists) {
        speciesId = baseSpecies.id;
        learnsetData = await gen.learnsets.get(speciesId as any);
      }
    }
    
    if (learnsetData && typeof learnsetData === 'object' && 'learnset' in learnsetData) {
      const learnset = (learnsetData as any).learnset;
      if (learnset && typeof learnset === 'object') {
        const moveIds = Object.keys(learnset);
        
        learnableMoves = moveIds.map(moveId => {
          const move = dex.moves.get(moveId);
          if (!move || !move.exists || move.isNonstandard) return null;
          if (move.isZ || move.isMax) return null;
          return move.name;
        }).filter(Boolean) as string[];
      } else {
        throw new Error(`No valid learnset data for ${targetSpecies}`);
      }
    } else {
      throw new Error(`No learnset data structure for ${targetSpecies}`);
    }
    
    return learnableMoves;
  } catch (error) {
    console.error('[Randomization] Error getting moves for', targetSpecies, ':', error);
    return [];
  }
}

function PokemonBuilder({ pokemon, index, format, onUpdate, onRemove, onDuplicate }: PokemonBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [moveSearchQueries, setMoveSearchQueries] = useState(['', '', '', '']);
  const [availableMovesList, setAvailableMovesList] = useState<{ value: string; label: string }[][]>([[], [], [], []]);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const pokemonData = useMemo(() => {
    if (!pokemon.species) return null;
    return getPokemonData(pokemon.species);
  }, [pokemon.species]);

  // Load available moves when pokemon species or search queries change
  useEffect(() => {
    if (!pokemon.species) {
      setAvailableMovesList([[], [], [], []]);
      return;
    }

    const loadMoves = async () => {
      const movePromises = moveSearchQueries.map((query, i) => 
        getAvailableMovesForSpecies(pokemon.species, query, pokemon.moves[i])
      );
      const results = await Promise.all(movePromises);
      setAvailableMovesList(results);
    };

    loadMoves();
  }, [pokemon.species, pokemon.moves, moveSearchQueries]);

  const availablePokemon = useMemo(() => {
    const allSpecies = dex.species.all()
      .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal')
      .map(s => ({ value: s.name as any, label: s.name as any }))
      .sort((a, b) => a.label.localeCompare(b.label));

    let results = allSpecies;

    if (searchQuery) {
      results = allSpecies.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (pokemon.species) {
      const selected = { value: pokemon.species as any, label: pokemon.species as any };
      results = [selected, ...results.filter(p => p.value !== pokemon.species)];
    }

    return results;
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

  const updateEv = (stat: keyof StatsTable, value: number | string) => {
    const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
    const newEvs = { ...pokemon.evs, [stat]: Math.min(252, Math.max(0, numValue)) };
    
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

  const randomizePokemon = async () => {
    const allValidSpecies = dex.species.all()
      .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal');
    
    let randomSpecies;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Try to find a Pokemon with valid moves
    while (attempts < maxAttempts) {
      randomSpecies = allValidSpecies[Math.floor(Math.random() * allValidSpecies.length)];
      
      if (!randomSpecies) {
        attempts++;
        continue;
      }

      const speciesData = getPokemonData(randomSpecies.name);
      if (!speciesData) {
        attempts++;
        continue;
      }

      const availableMoves = await getMovesForRandomization(randomSpecies.name);
      if (availableMoves.length >= 4) {
        break;
      }
      
      console.warn(`Skipping ${randomSpecies.name} - only ${availableMoves.length} moves available`);
      attempts++;
    }
    
    if (!randomSpecies || attempts >= maxAttempts) {
      console.error('Could not find a valid Pokemon with moves after', maxAttempts, 'attempts');
      return;
    }

    const speciesData = getPokemonData(randomSpecies.name);
    if (!speciesData) return;

    const randomAbility = speciesData.abilities[Math.floor(Math.random() * speciesData.abilities.length)];
    const randomNature = NATURES[Math.floor(Math.random() * NATURES.length)];
    
    const viableItems = dex.items.all()
      .filter(i => i.exists && !i.isNonstandard && !i.zMove && !i.megaStone)
      .map(i => i.name);
    
    const randomItem = viableItems[Math.floor(Math.random() * viableItems.length)] || 'Leftovers';

    const allAvailableMoves = await getMovesForRandomization(randomSpecies.name);
    
    const randomMoves: string[] = [];
    
    const shuffledMoves = [...allAvailableMoves].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledMoves.length && randomMoves.length < 4; i++) {
      const currentMove = shuffledMoves[i];
      
      if (currentMove && !randomMoves.includes(currentMove)) {
        randomMoves.push(currentMove);
      }
    }
    
    if (randomMoves.length < 4) {
      console.error(`Only found ${randomMoves.length} moves for ${randomSpecies.name}`);
      return;
    }

    const randomSpread = COMMON_SPREADS[Math.floor(Math.random() * COMMON_SPREADS.length)];
    
    const randomTeraType = availableTypes[Math.floor(Math.random() * availableTypes.length)].value;

    const updateData = {
      ...pokemon,
      species: randomSpecies.name,
      ability: randomAbility,
      item: randomItem,
      nature: randomNature,
      evs: randomSpread.evs,
      moves: randomMoves.slice(0, 4),
      teraType: randomTeraType,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      level: 100
    };
    
    onUpdate(updateData);
  };

  const totalEvs = Object.values(pokemon.evs).reduce((sum, ev) => sum + ev, 0);

  return (
    <Card shadow="sm" radius="md" withBorder p="sm">
      <Stack gap="sm">
        {/* Mobile Layout */}
        {isMobile && (
          <>
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={8} align="center">
                  {pokemon.species && (
                    <PokemonSprite species={pokemon.species} className="w-12 h-12" />
                  )}
                  {pokemon.species && pokemonData && (
                    <Box style={{ display: 'flex', justifyContent: 'center' }}>
                      {pokemonData.types.map((type, i) => (
                        <Badge
                          key={type}
                          size="xs"
                          style={{
                            backgroundColor: TYPE_COLORS[type],
                            color: 'white',
                            marginLeft: i > 0 ? '4px' : '0'
                          }}
                        >
                          {type}
                        </Badge>
                      ))}
                    </Box>
                  )}
                </Stack>
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Select
                    placeholder="Choose Pokemon"
                    data={availablePokemon}
                    value={pokemon.species || null}
                    onChange={(value) => {
                      onUpdate({ ...pokemon, species: value || '', ability: '', moves: [] });
                    }}
                    searchable
                    onSearchChange={setSearchQuery}
                    size="sm"
                    clearable
                    key={`pokemon-select-${index}-${pokemon.species}`}
                  />
                  <Group gap={4} justify="center">
                    <ActionIcon size="sm" variant="subtle" color="violet" onClick={randomizePokemon}>
                      <IconDice3 size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" variant="subtle" onClick={onDuplicate} disabled={!pokemon.species}>
                      <IconCopy size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" variant="subtle" color="red" onClick={onRemove}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
              </Group>
            </Stack>
          </>
        )}

        {/* Desktop Layout */}
        {!isMobile && (
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
                w={200}
                size="sm"
                clearable
                key={`pokemon-select-${index}-${pokemon.species}`}
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
                  {[0, 1, 2, 3].map((i) => {
                    const moveData = availableMovesList[i] || [];
                    return (
                      <Select
                        key={`move-${i}-${pokemon.species}-${pokemon.moves[i] || ''}`}
                        placeholder={`Move ${i + 1}`}
                        data={moveData}
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
                    );
                  })}
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

export function TeamBuilder({ format, initialTeam, onTeamUpdate, onExport }: TeamBuilderProps) {
  const [team, setTeam] = useState<Team>(
    initialTeam || { format, pokemon: [getDefaultPokemon()] }
  );
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

  const randomizeTeam = async () => {
    const randomPokemon: Pokemon[] = [];
    const existingValidCount = team.pokemon.filter(p => p.species).length;
    const numToGenerate = Math.min(6 - existingValidCount, 6);
    
    const viableItems = dex.items.all()
      .filter(i => i.exists && !i.isNonstandard && !i.zMove && !i.megaStone)
      .map(i => i.name);
    
    const allValidSpecies = dex.species.all()
      .filter(s => s.exists && !s.isNonstandard && s.tier !== 'Illegal');
    
    for (let i = 0; i < numToGenerate; i++) {
      let randomSpecies;
      let attempts = 0;
      const maxAttempts = 10;
      
      // Try to find a Pokemon with valid moves
      while (attempts < maxAttempts) {
        randomSpecies = allValidSpecies[Math.floor(Math.random() * allValidSpecies.length)];
        
        if (!randomSpecies) {
          attempts++;
          continue;
        }

        const speciesData = getPokemonData(randomSpecies.name);
        if (!speciesData) {
          attempts++;
          continue;
        }

        const availableMoves = await getMovesForRandomization(randomSpecies.name);
        if (availableMoves.length >= 4) {
          break;
        }
        
        console.warn(`Skipping ${randomSpecies.name} for team - only ${availableMoves.length} moves available`);
        attempts++;
      }
      
      if (!randomSpecies || attempts >= maxAttempts) {
        console.error('Could not find valid Pokemon for slot', i + 1);
        continue;
      }

      const speciesData = getPokemonData(randomSpecies.name);
      if (!speciesData) continue;

      const randomAbility = speciesData.abilities[Math.floor(Math.random() * speciesData.abilities.length)];
      const randomNature = NATURES[Math.floor(Math.random() * NATURES.length)];
      const randomItem = viableItems[Math.floor(Math.random() * viableItems.length)] || 'Leftovers';

      const availableMoves = await getMovesForRandomization(randomSpecies.name);
      
      const randomMoves: string[] = [];
      const shuffledMoves = [...availableMoves].sort(() => Math.random() - 0.5);
      
      for (let j = 0; j < shuffledMoves.length && randomMoves.length < 4; j++) {
        if (shuffledMoves[j] && !randomMoves.includes(shuffledMoves[j])) {
          randomMoves.push(shuffledMoves[j]);
        }
      }
      
      if (randomMoves.length < 4) {
        console.error(`Only found ${randomMoves.length} moves for ${randomSpecies.name} in team generation`);
        continue;
      }

      const randomSpread = COMMON_SPREADS[Math.floor(Math.random() * COMMON_SPREADS.length)];
      
      const randomTeraType = Object.keys(TYPE_COLORS)[Math.floor(Math.random() * Object.keys(TYPE_COLORS).length)];
      
      const pokemonData = {
        species: randomSpecies.name,
        ability: randomAbility,
        item: randomItem,
        nature: randomNature,
        evs: randomSpread.evs,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: randomMoves.slice(0, 4),
        level: 100,
        teraType: randomTeraType
      };
      
      randomPokemon.push(pokemonData);
    }
    
    const existingValidPokemon = team.pokemon.filter(p => p.species);
    const newPokemon = [...existingValidPokemon, ...randomPokemon].slice(0, 6);
    
    const newTeam = {
      ...team,
      pokemon: newPokemon
    };
    
    setTeam(newTeam);
    onTeamUpdate(newTeam);
  };

  const handleExport = () => {
    if (onExport) {
      onExport(team);
    }
  };

  const validPokemon = team.pokemon.filter(p => p.species).length;

  return (
    <Stack gap="md">
      {/* Team Controls */}
      <Paper withBorder p="sm">
        {!isMobile ? (
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
                onClick={handleExport}
                disabled={validPokemon === 0}
              >
                Export
              </Button>
            </Group>
          </Group>
        ) : (
          <Stack gap="xs" align="center" style={{ width: '100%' }}>
            <Group gap="xs" position="center" style={{ width: '100%', justifyContent: 'center' }}>
              <Text fw={600} size="sm">Team Builder</Text>
              <Badge size="sm" variant="filled">
                {validPokemon}/6 Pokemon
              </Badge>
            </Group>
            <Group gap="xs" position="center" style={{ width: '100%', justifyContent: 'center' }}>
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
                onClick={handleExport}
                disabled={validPokemon === 0}
              >
                Export
              </Button>
            </Group>
          </Stack>
        )}
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
  );
}
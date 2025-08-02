import { Paper, SimpleGrid, Group, Text, Badge, Stack, ActionIcon, Tooltip, Box } from '@mantine/core';
import { IconEdit, IconCopy, IconEye } from '@tabler/icons-react';
import { Team, Pokemon } from '@/types';
import { PokemonSprite } from '@/components/common/PokemonSprite';
import { getPokemonData } from '@/lib/pokemon/data-service';
import { FormatId, FORMATS } from '@/lib/pokemon/formats';

interface TeamSummaryProps {
  team: Team;
  format: FormatId;
  onEdit?: () => void;
  onExport?: () => void;
}

interface PokemonCardProps {
  pokemon: Pokemon;
  index: number;
}

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

function PokemonCard({ pokemon, index }: PokemonCardProps) {
  const data = getPokemonData(pokemon.species);
  
  if (!pokemon.species) {
    return (
      <Paper shadow="xs" p="xs" radius="md" withBorder style={{ height: '100%', minHeight: 80 }}>
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Text size="xs" c="dimmed">Empty Slot</Text>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper shadow="xs" p="xs" radius="md" withBorder style={{ height: '100%' }}>
      <Group gap="xs" wrap="nowrap">
        <PokemonSprite 
          species={pokemon.species} 
          className="w-12 h-12 flex-shrink-0"
        />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>{pokemon.species}</Text>
          {pokemon.item && (
            <Text size="xs" c="dimmed" truncate>
              @ {pokemon.item}
            </Text>
          )}
          {data && (
            <Group gap={2}>
              {data.types.map((type) => (
                <Badge 
                  key={type} 
                  size="xs" 
                  variant="filled"
                  style={{ 
                    backgroundColor: TYPE_COLORS[type],
                    color: 'white',
                    textShadow: '0 0 2px rgba(0,0,0,0.5)'
                  }}
                >
                  {type}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

export function TeamSummary({ team, format, onEdit, onExport }: TeamSummaryProps) {
  const validPokemon = team.pokemon.filter(p => p.species).length;
  
  // Ensure we always have 6 slots
  const displayTeam = [...team.pokemon];
  while (displayTeam.length < 6) {
    displayTeam.push({
      species: '',
      ability: '',
      item: '',
      nature: 'Hardy',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: []
    });
  }
  
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group>
          <Text fw={600} size="lg">Team Overview</Text>
          <Badge size="lg" variant="filled">
            {validPokemon}/6 Pokemon
          </Badge>
        </Group>
        <Group gap="xs">
          {onEdit && (
            <Tooltip label="Edit in Builder">
              <ActionIcon variant="light" onClick={onEdit}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {onExport && (
            <Tooltip label="Export Team">
              <ActionIcon variant="light" onClick={onExport}>
                <IconCopy size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Badge size="sm" variant="light">
            {FORMATS[format].name}
          </Badge>
        </Group>
      </Group>
      
      <SimpleGrid 
        cols={{ base: 2, sm: 3 }} 
        spacing="xs"
      >
        {displayTeam.slice(0, 6).map((pokemon, index) => (
          <PokemonCard 
            key={index} 
            pokemon={pokemon} 
            index={index} 
          />
        ))}
      </SimpleGrid>
    </Paper>
  );
}
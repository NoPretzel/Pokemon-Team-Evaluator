import { Paper, SimpleGrid, Group, Text, Badge, Stack, ActionIcon, Tooltip, Box, Center } from '@mantine/core';
import { IconEdit, IconCopy } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
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
  isMobile: boolean;
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

function PokemonCard({ pokemon, index, isMobile }: PokemonCardProps) {
  const data = getPokemonData(pokemon.species);
  
  if (!pokemon.species) {
    return (
      <Paper shadow="xs" p="xs" radius="md" withBorder style={{ height: 'auto', minHeight: isMobile ? 80 : 100, overflow: 'hidden' }}>
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Text size="xs" c="dimmed">Empty</Text>
        </Box>
      </Paper>
    );
  }
  
  if (isMobile) {
    return (
      <Paper shadow="xs" p="xs" radius="md" withBorder style={{ height: 'auto', minHeight: isMobile ? 80 : 100, overflow: 'hidden' }}>
        <Stack gap={4} align="center">
          <PokemonSprite 
            species={pokemon.species} 
            className="w-10 h-10"
          />
        </Stack>
      </Paper>
    );
  }
  
  // Desktop layout - full info
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
  const isMobile = useMediaQuery('(max-width: 768px)');
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
    <Paper shadow="sm" p={isMobile ? "sm" : "md"} radius="md" withBorder className="top-level-card">
      <Stack gap="sm">
        {/* Header */}
        {isMobile ? (
          <>
            <Group justify="space-between">
              <Text fw={600} size="lg">Team Overview</Text>
              <Group gap="xs">
                {onEdit && (
                  <ActionIcon variant="light" onClick={onEdit}>
                    <IconEdit size={16} />
                  </ActionIcon>
                )}
                {onExport && (
                  <ActionIcon variant="light" onClick={onExport}>
                    <IconCopy size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
            <Center>
              <Badge size="lg" variant="filled">
                {FORMATS[format].name}
              </Badge>              

            </Center>
          </>
        ) : (
          <Group justify="space-between">
            <Text fw={600} size="lg">Team Overview</Text>
            <Badge size="lg" variant="filled">
              {FORMATS[format].name}
            </Badge>
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
            </Group>
          </Group>
        )}
        
        {/* Pokemon Grid */}
        <SimpleGrid 
          cols={{ base: 3, sm: 3 }} 
          spacing="xs"
        >
          {displayTeam.slice(0, 6).map((pokemon, index) => (
            <PokemonCard 
              key={index} 
              pokemon={pokemon} 
              index={index}
              isMobile={isMobile}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
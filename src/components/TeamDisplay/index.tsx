import { Paper, SimpleGrid, Group, Text, Badge, Stack, Title, Box } from '@mantine/core';
import { Team, Pokemon } from '@/types';
import { PokemonSprite } from '@/components/common/PokemonSprite';
import { ItemSprite } from '@/components/common/ItemSprite';
import { getPokemonData } from '@/lib/pokemon/data-service';
import { FormatId, FORMATS } from '@/lib/pokemon/formats';

interface TeamDisplayProps {
  team: Team;
  format: FormatId;
}

interface PokemonCardProps {
  pokemon: Pokemon;
  index: number;
}

function PokemonCard({ pokemon, index }: PokemonCardProps) {
  const data = getPokemonData(pokemon.species);
  
  return (
    <Paper shadow="xs" p="sm" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <PokemonSprite 
            species={pokemon.species} 
            className="w-16 h-16 flex-shrink-0"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="sm" truncate>{pokemon.species}</Text>
            {pokemon.item && (
              <Group gap={6} wrap="nowrap" align="center">
                <div style={{ flexShrink: 0 }}>
                  <ItemSprite item={pokemon.item} className="inline-block" />
                </div>
                <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                  {pokemon.item}
                </Text>
              </Group>
            )}
          </div>
        </Group>
        
        {pokemon.teraType && (
          <Badge size="xs" variant="light" color="violet" style={{ flexShrink: 0 }}>
            Tera: {pokemon.teraType}
          </Badge>
        )}
      </Group>
      
      <Stack gap={4}>
        <Text size="xs" c="dimmed">
          {pokemon.ability} | {pokemon.nature}
        </Text>
        
        <Group gap={4}>
          {data?.types.map((type) => (
            <Badge 
              key={type} 
              size="xs" 
              variant="filled"
              className={`type-${type.toLowerCase()}`}
              style={{ 
                color: 'white',
                textShadow: '0 0 2px rgba(0,0,0,0.5)'
              }}
            >
              {type}
            </Badge>
          ))}
        </Group>
        
        <Box mt="xs">
          {pokemon.moves.map((move, i) => (
            <Text key={i} size="xs" pl="xs">
              • {move}
            </Text>
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}

export function TeamDisplay({ team, format }: TeamDisplayProps) {
  return (
    <Stack>
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Your Team</Title>
          <Badge size="lg" variant="filled">
            {FORMATS[format].name}
          </Badge>
        </Group>
        
        <SimpleGrid 
          cols={{ base: 1, sm: 2, lg: 3 }} 
          spacing="md"
        >
          {team.pokemon.map((pokemon, index) => (
            <PokemonCard 
              key={index} 
              pokemon={pokemon} 
              index={index} 
            />
          ))}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
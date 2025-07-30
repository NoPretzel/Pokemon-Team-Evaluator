import { useState, useEffect } from 'react';
import { Card, Text, Badge, Group, Stack, Grid, Tooltip, Progress, Box } from '@mantine/core';
import { IconCheck, IconX, IconSword, IconShield, IconBolt, IconBan } from '@tabler/icons-react';
import { Team, PokemonUsage } from '@/types';
import { calculate, Generations, Pokemon as CalcPokemon, Move } from '@smogon/calc';
import { PokemonSprite } from '@/components/common/PokemonSprite';

const gen = Generations.get(9);

interface MetaCoverageProps {
  team: Team;
  format: string;
}

interface PokemonMatchup {
  pokemon: string;
  usage: number;
  nature: string;
  benchmarks: {
    offensive: {
      passed: boolean;
      canCounter: number;
      details: string;
    };
    defensive: {
      passed: boolean;
      bestWallDamage: number;
      wallName: string;
    };
    speed: {
      passed: boolean;
      fasterCount: number;
    };
    setup: {
      passed: boolean;
      hasSetup: boolean;
      hasCounterplay: boolean;
    };
  };
  checkedCount: number;
  isChecked: boolean;
}

const SETUP_MOVES = [
  'swordsdance', 'dragondance', 'nastyplot', 'calmmind', 'bulkup', 'coil',
  'quiverdance', 'shellsmash', 'agility', 'rockpolish', 'autotomize',
  'cosmicpower', 'amnesia', 'irondefense', 'acidarmor', 'barrier',
  'workup', 'honeclaws', 'tailglow', 'geomancy', 'minimize', 'growth'
];

const COUNTERPLAY_MOVES = ['haze', 'encore', 'taunt', 'roar', 'whirlwind', 'dragontail', 'circlethrow'];

function toID(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseSpread(spreadStr: string): { nature: string; evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } } {
  const [nature, evString] = spreadStr.split(':');
  const evArray = evString.split('/').map(ev => parseInt(ev) || 0);
  
  return {
    nature,
    evs: {
      hp: evArray[0] || 0,
      atk: evArray[1] || 0,
      def: evArray[2] || 0,
      spa: evArray[3] || 0,
      spd: evArray[4] || 0,
      spe: evArray[5] || 0,
    }
  };
}

function calculateSpeed(pokemon: any, level: number = 100): number {
  const baseSpe = pokemon.baseStats?.spe || pokemon.stats?.spe || 0;
  const evs = pokemon.evs?.spe || 0;
  const ivs = pokemon.ivs?.spe || 31;
  const nature = pokemon.nature || 'Serious';
  
  let stat = Math.floor(((2 * baseSpe + ivs + Math.floor(evs / 4)) * level / 100) + 5);
  
  const speedBoostingNatures = ['Timid', 'Hasty', 'Jolly', 'Naive'];
  const speedLoweringNatures = ['Brave', 'Relaxed', 'Quiet', 'Sassy'];
  
  if (speedBoostingNatures.includes(nature)) {
    stat = Math.floor(stat * 1.1);
  } else if (speedLoweringNatures.includes(nature)) {
    stat = Math.floor(stat * 0.9);
  }
  
  return stat;
}

export function MetaCoverage({ team, format }: MetaCoverageProps) {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<PokemonUsage[]>([]);
  const [matchupResults, setMatchupResults] = useState<PokemonMatchup[]>([]);

  useEffect(() => {
    fetchUsageData();
  }, [format]);

  useEffect(() => {
    if (usageData.length > 0 && team.pokemon.length > 0) {
      analyzeMatchups();
    }
  }, [usageData, team]);

  const fetchUsageData = async () => {
    try {
      const response = await fetch(`/api/usage?format=${format}`);
      if (response.ok) {
        const data = await response.json();
        setUsageData(data.pokemon?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeMatchups = () => {
    const results: PokemonMatchup[] = [];
    
    for (const metaPokemon of usageData) {
      const pokemonId = toID(metaPokemon.name);
      
      const topSpread = Object.keys(metaPokemon.spreads || {})[0];
      const topMoves = Object.keys(metaPokemon.moves || {}).slice(0, 4);
      const topItem = Object.keys(metaPokemon.items || {})[0];
      const topAbility = Object.keys(metaPokemon.abilities || {})[0];
      
      let nature = 'Serious';
      let evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      
      if (topSpread) {
        const parsed = parseSpread(topSpread);
        nature = parsed.nature;
        evs = parsed.evs;
      } else {
        const species = gen.species.get(pokemonId as any);
        if (species) {
          if ((species.baseStats.atk || 0) > (species.baseStats.spa || 0)) {
            nature = 'Adamant';
            evs = { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 };
          } else {
            nature = 'Modest';
            evs = { hp: 0, atk: 0, def: 4, spa: 252, spd: 0, spe: 252 };
          }
        }
      }
      
      const species = gen.species.get(pokemonId as any);
      if (!species) continue;
      
      const opponentPokemon = new CalcPokemon(gen, pokemonId as any, {
        level: 100,
        ability: topAbility,
        item: topItem,
        nature,
        evs,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
      });
      
      const hasSetup = topMoves.some(move => SETUP_MOVES.includes(toID(move)));
      
      let canCounterCount = 0;
      let bestWallDamage = 100;
      let bestWallName = '';
      let fasterCount = 0;
      let hasCounterplay = false;
      
      const teamCounterDetails: string[] = [];
      
      for (const teamMember of team.pokemon) {
        if (!teamMember.species || teamMember.moves.length === 0) continue;
        
        const teamSpecies = gen.species.get(toID(teamMember.species) as any);
        if (!teamSpecies) continue;
        
        const attacker = new CalcPokemon(gen, toID(teamMember.species) as any, {
          level: 100,
          ability: teamMember.ability,
          item: teamMember.item,
          nature: teamMember.nature,
          evs: teamMember.evs,
          ivs: teamMember.ivs
        });
        
        const teamSpeed = calculateSpeed(attacker, 100);
        const opponentSpeed = calculateSpeed(opponentPokemon, 100);
        if (teamSpeed > opponentSpeed) {
          fasterCount++;
        }
        
        if (teamMember.moves.some(move => COUNTERPLAY_MOVES.includes(toID(move)))) {
          hasCounterplay = true;
        }
        
        let bestDamageFromThis = 0;
        let bestMoveFromThis = '';
        
        for (const moveName of teamMember.moves) {
          const moveId = toID(moveName);
          const move = gen.moves.get(moveId as any);
          if (!move || !move.basePower || move.basePower === 0) continue;
          
          const result = calculate(
            gen,
            attacker,
            opponentPokemon,
            new Move(gen, moveId as any)
          );
          
          const damage = result.damage;
          let maxDamage = 0;
          
          if (typeof damage === 'number') {
            maxDamage = damage;
          } else if (Array.isArray(damage)) {
            if (damage.length > 0 && typeof damage[0] === 'number') {
              maxDamage = Math.max(...(damage as number[]));
            } else if (damage.length > 0 && Array.isArray(damage[0])) {
              const flatDamage = (damage as number[][]).flat();
              maxDamage = Math.max(...flatDamage);
            }
          }
          
          const damagePercent = (maxDamage / opponentPokemon.maxHP()) * 100;
          
          if (damagePercent > bestDamageFromThis) {
            bestDamageFromThis = damagePercent;
            bestMoveFromThis = moveName;
          }
        }
        
        let canSurvive = true;
        
        for (const moveName of topMoves) {
          const moveId = toID(moveName);
          const move = gen.moves.get(moveId as any);
          if (!move || !move.basePower || move.basePower === 0) continue;
          
          const result = calculate(
            gen,
            opponentPokemon,
            attacker,
            new Move(gen, moveId as any)
          );
          
          const damage = result.damage;
          let maxDamage = 0;
          
          if (typeof damage === 'number') {
            maxDamage = damage;
          } else if (Array.isArray(damage)) {
            if (damage.length > 0 && typeof damage[0] === 'number') {
              maxDamage = Math.max(...(damage as number[]));
            } else if (damage.length > 0 && Array.isArray(damage[0])) {
              const flatDamage = (damage as number[][]).flat();
              maxDamage = Math.max(...flatDamage);
            }
          }
          
          const damagePercent = (maxDamage / attacker.maxHP()) * 100;
          
          if (damagePercent >= 100 && teamSpeed <= opponentSpeed) {
            canSurvive = false;
          }
        }
        
        if (bestDamageFromThis >= 50 && (canSurvive || teamSpeed > opponentSpeed)) {
          canCounterCount++;
          const koType = bestDamageFromThis >= 100 ? 'OHKO' : '2HKO';
          teamCounterDetails.push(`${teamMember.species} (${koType})`);
        }
        
        if (bestDamageFromThis < 15) {
          if (bestDamageFromThis < bestWallDamage) {
            bestWallDamage = bestDamageFromThis;
            bestWallName = teamMember.species;
          }
        }
      }
      
      const benchmarks = {
        offensive: {
          passed: canCounterCount >= 1,
          canCounter: canCounterCount,
          details: teamCounterDetails.slice(0, 2).join(', ')
        },
        defensive: {
          passed: bestWallDamage < 15,
          bestWallDamage,
          wallName: bestWallName
        },
        speed: {
          passed: fasterCount >= Math.ceil(team.pokemon.filter(p => p.species).length / 2),
          fasterCount
        },
        setup: {
          passed: !hasSetup || hasCounterplay,
          hasSetup,
          hasCounterplay
        }
      };
      
      const checkedCount = Object.values(benchmarks).filter(b => b.passed).length;
      const totalBenchmarks = hasSetup ? 4 : 3;
      const requiredPercentage = 0.30;
      const isChecked = (checkedCount / totalBenchmarks) >= requiredPercentage;
      
      results.push({
        pokemon: metaPokemon.name,
        usage: metaPokemon.usage,
        nature,
        benchmarks,
        checkedCount,
        isChecked
      });
    }
    
    setMatchupResults(results);
  };

  const totalChecked = matchupResults.filter(r => r.isChecked).length;
  const overallScore = (totalChecked / Math.max(matchupResults.length, 1)) * 100;
  const passed = overallScore >= 60;

  if (loading) {
    return (
      <Card shadow="sm" radius="md" withBorder>
        <Text ta="center" c="dimmed">Loading meta data...</Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Text fw={600} size="lg">Meta Coverage</Text>
          <Badge 
            size="lg" 
            color={passed ? 'green' : 'red'}
          >
            {passed ? 'PASS' : 'FAIL'} - {overallScore.toFixed(0)}%
          </Badge>
        </Group>

        <Text size="sm" c="dimmed" ta="center">
          To check a Pokémon: Pass 30% of benchmarks (2/4 with setup, 1/3 without).
          Offensive (OHKO/2HKO), Defensive (wall &lt;15%), Speed (50%+ faster), Setup (counterplay)
        </Text>

        <Grid>
          {matchupResults.map((result) => (
            <Grid.Col key={result.pokemon} span={{ base: 12, sm: 6, md: 4 }}>
              <Card 
                withBorder 
                p="sm"
                style={{
                  borderColor: result.isChecked ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)',
                  borderWidth: 2
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                      <PokemonSprite species={result.pokemon} />
                      <div>
                        <Text fw={600} size="sm">{result.pokemon}</Text>
                        <Text size="xs" c="dimmed">
                          {result.nature || 'Unknown Nature'}
                        </Text>
                      </div>
                    </Group>
                    {result.isChecked && (
                      <Badge color="green" leftSection={<IconCheck size={14} />}>
                        Checked
                      </Badge>
                    )}
                  </Group>

                  <Stack gap={4} style={{ minHeight: 80 }}>
                    <Group gap="xs">
                      <IconSword 
                        size={16} 
                        color={result.benchmarks.offensive.passed ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)'}
                      />
                      <Text size="xs">
                        {result.benchmarks.offensive.canCounter > 0 
                          ? `${result.benchmarks.offensive.canCounter} can KO: ${result.benchmarks.offensive.details}`
                          : 'No reliable KOs'
                        }
                      </Text>
                    </Group>

                    <Group gap="xs">
                      <IconShield 
                        size={16} 
                        color={result.benchmarks.defensive.passed ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)'}
                      />
                      <Text size="xs">
                        {result.benchmarks.defensive.passed
                          ? `${result.benchmarks.defensive.wallName} walls (${result.benchmarks.defensive.bestWallDamage.toFixed(1)}%)`
                          : 'No defensive checks'
                        }
                      </Text>
                    </Group>

                    <Group gap="xs">
                      <IconBolt 
                        size={16} 
                        color={result.benchmarks.speed.passed ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)'}
                      />
                      <Text size="xs">
                        {result.benchmarks.speed.fasterCount}/{team.pokemon.filter(p => p.species).length} outspeeds
                      </Text>
                    </Group>

                    <Group gap="xs" style={{ minHeight: 20 }}>
                      {result.benchmarks.setup.hasSetup ? (
                        <>
                          <IconBan 
                            size={16} 
                            color={result.benchmarks.setup.passed ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)'}
                          />
                          <Text size="xs">
                            {result.benchmarks.setup.hasCounterplay ? 'Setup handled' : 'Setup threat!'}
                          </Text>
                        </>
                      ) : (
                        <Box style={{ height: 20 }} />
                      )}
                    </Group>
                  </Stack>

                  <Progress 
                    value={(result.checkedCount / (result.benchmarks.setup.hasSetup ? 4 : 3)) * 100} 
                    color={result.isChecked ? 'green' : 'red'}
                    size="sm"
                  />
                  <Text size="xs" c="dimmed" ta="center">
                    {result.checkedCount}/{result.benchmarks.setup.hasSetup ? 4 : 3} benchmarks passed
                    {!result.benchmarks.setup.hasSetup && ' (no setup)'}
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    </Card>
  );
}
import { redis } from '@/lib/redis/client';
import { FormatId, FORMATS } from '@/lib/pokemon/formats';
import { UsageStats, PokemonUsage } from '@/types';

const SMOGON_STATS_BASE_URL = 'https://www.smogon.com/stats';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

async function request(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${url} - ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

async function getLatestMonth(): Promise<string> {
  try {
    // Fetch the stats index page to find available months
    const response = await fetch(SMOGON_STATS_BASE_URL);
    const html = await response.text();
    
    // Parse month directories from the HTML
    const monthPattern = /href="(\d{4}-\d{2})\/"/g;
    const months: string[] = [];
    let match;
    
    while ((match = monthPattern.exec(html)) !== null) {
      months.push(match[1]);
    }
    
    // Sort months and get the latest one
    months.sort((a, b) => b.localeCompare(a));
    
    if (months.length > 0) {
      console.log(`Found available months: ${months.slice(0, 3).join(', ')}`);
      return months[0];
    }
  } catch (error) {
    console.error('Error fetching available months:', error);
  }
  
  // Fallback to calculating previous month
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseUsageStatsText(text: string): { totalBattles: number; pokemon: PokemonUsage[] } {
  const lines = text.split('\n');
  const pokemon: PokemonUsage[] = [];
  let totalBattles = 0;
  
  // Extract total battles from header
  const totalBattlesMatch = text.match(/Total battles:\s*(\d+)/i);
  if (totalBattlesMatch) {
    totalBattles = parseInt(totalBattlesMatch[1]);
  }
  
  let inPokemonSection = false;
  let currentRank = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for the table header
    if (line.includes('| Rank | Pokemon') || line.includes('+------+-')) {
      inPokemonSection = true;
      continue;
    }
    
    if (!inPokemonSection) continue;
    
    // Stop if we hit another separator or empty section
    if (line.trim() === '' || (line.includes('+----+') && currentRank > 0)) {
      break;
    }
    
    // Parse Pokemon lines
    const match = line.match(/\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([\d.]+)%\s*\|\s*(\d+)\s*\|\s*([\d.]+)%\s*\|\s*(\d+)\s*\|\s*([\d.]+)%\s*\|/);
    
    if (match) {
      currentRank++;
      const [_, rank, name, usage, raw, rawPercent, real, realPercent] = match;
      
      pokemon.push({
        rank: parseInt(rank.trim()),
        name: name.trim(),
        usage: parseFloat(usage),
        raw: parseInt(raw.trim()),
        rawPercent: parseFloat(rawPercent),
        real: parseInt(real.trim()),
        realPercent: parseFloat(realPercent),
        abilities: {},
        items: {},
        spreads: {},
        moves: {},
        teammates: {},
        checksAndCounters: {},
      });
      
      // Get top 10 Pokemon
      if (currentRank >= 10) break;
    }
  }
  
  return { totalBattles, pokemon };
}

function parseChaosData(jsonData: any): Record<string, any> {
  const data = jsonData.data || {};
  const processedData: Record<string, any> = {};
  
  for (const [pokemon, stats] of Object.entries(data)) {
    const statsData = stats as any;
    processedData[pokemon] = {
      Moves: statsData.Moves || {},
      Abilities: statsData.Abilities || {},
      Items: statsData.Items || {},
      Spreads: statsData.Spreads || {},
      Teammates: statsData.Teammates || {},
      'Checks and Counters': statsData['Checks and Counters'] || {}
    };
  }
  
  return processedData;
}

async function fetchFormatStats(format: string, month: string, rating: number = 1695): Promise<UsageStats | null> {
  try {
    const usageUrl = `${SMOGON_STATS_BASE_URL}/${month}/${format}-${rating}.txt`;
    const chaosUrl = `${SMOGON_STATS_BASE_URL}/${month}/chaos/${format}-${rating}.json`;
    
    console.log(`Fetching usage stats for ${format} from: ${usageUrl}`);
    
    const usageText = await request(usageUrl);
    const { totalBattles, pokemon: usagePokemon } = parseUsageStatsText(usageText);
    
    if (usagePokemon.length === 0) {
      console.error(`No Pokemon found in ${format} usage stats`);
      return null;
    }
    
    // Try to get chaos data
    let chaosData: any = {};
    try {
      console.log(`Fetching movesets for ${format} from: ${chaosUrl}`);
      const rawChaos = await request(chaosUrl);
      const parsedChaos = JSON.parse(rawChaos);
      chaosData = parseChaosData(parsedChaos);
    } catch (error) {
      console.warn(`Could not fetch chaos data for ${format}:`, error);
    }
    
    const enhancedPokemon: PokemonUsage[] = usagePokemon.map(poke => {
      const data = chaosData[poke.name];
      if (!data) {
        return poke;
      }
      
      // Extract top moves
      const moves: Record<string, number> = {};
      const sortedMoves = Object.entries(data.Moves || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 6);
      sortedMoves.forEach(([move, usage]) => {
        moves[move] = usage as number;
      });
      
      // Extract abilities
      const abilities: Record<string, number> = {};
      Object.entries(data.Abilities || {}).forEach(([ability, usage]) => {
        abilities[ability] = usage as number;
      });
      
      // Extract items
      const items: Record<string, number> = {};
      Object.entries(data.Items || {}).forEach(([item, usage]) => {
        items[item] = usage as number;
      });
      
      // Extract EV spreads (top 3)
      const spreads: Record<string, number> = {};
      const sortedSpreads = Object.entries(data.Spreads || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3);
      sortedSpreads.forEach(([spread, usage]) => {
        spreads[spread] = usage as number;
      });
      
      // Extract teammates (top 5)
      const teammates: Record<string, number> = {};
      const sortedTeammates = Object.entries(data.Teammates || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5);
      sortedTeammates.forEach(([teammate, score]) => {
        teammates[teammate] = score as number;
      });
      
      // Extract checks and counters (top 5)
      const checksAndCounters: Record<string, number> = {};
      const sortedCounters = Object.entries(data['Checks and Counters'] || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5);
      sortedCounters.forEach(([counter, score]) => {
        checksAndCounters[counter] = score as number;
      });
      
      return {
        ...poke,
        abilities,
        items,
        spreads,
        moves,
        teammates,
        checksAndCounters,
      };
    });
    
    return {
      format,
      month,
      totalBattles,
      pokemon: enhancedPokemon,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${format} stats:`, error);
    return null;
  }
}

async function updateAllFormats() {
  const month = await getLatestMonth();
  console.log(`Updating usage stats for month: ${month}`);
  
  const results: Record<string, UsageStats> = {};
  
  // Fetch stats for each format
  for (const [formatId, formatInfo] of Object.entries(FORMATS)) {
=    if (formatId === 'gen9vgc2024') {
      continue;
    }
    
    // Try different ratings if default doesn't work
    const ratings = [1695, 1825, 1760, 1630, 1500, 0];
    let stats: UsageStats | null = null;
    
    for (const rating of ratings) {
      try {
        stats = await fetchFormatStats(formatId, month, rating);
        if (stats && stats.pokemon.length > 0) {
          console.log(`Successfully fetched ${formatId} stats at ${rating} rating`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (stats && stats.pokemon.length > 0) {
      results[formatId] = stats;
      
      // Cache in Redis
      const key = `usage:${formatId}:${month}`;
      await redis.setex(key, CACHE_TTL, JSON.stringify(stats));
      
      // Also cache current stats without month for easy access
      await redis.setex(`usage:${formatId}:current`, CACHE_TTL, JSON.stringify(stats));
      
      console.log(`Cached ${formatId} stats in Redis (${stats.pokemon.length} Pokemon)`);
      
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Store the latest month for reference
  await redis.set('usage:latest-month', month);
  
  console.log(`Update completed. Cached stats for: ${Object.keys(results).join(', ')}`);
  
  return results;
}

if (require.main === module) {
  updateAllFormats()
    .then(() => {
      console.log('Usage stats update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error updating usage stats:', error);
      process.exit(1);
    });
}

export { updateAllFormats, fetchFormatStats };
import { redis } from '@/lib/redis/client';
import { FormatId, FORMATS } from '@/lib/pokemon/formats';
import { UsageStats, PokemonUsage } from '@/types';

const SMOGON_STATS_BASE_URL = 'https://www.smogon.com/stats';
const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

async function getLatestMonth(): Promise<string> {
  try {
    // Fetch the stats index page to find available months
    const response = await fetch(SMOGON_STATS_BASE_URL);
    const html = await response.text();
    
    // Parse month directories from the HTML
    // Look for patterns like href="2024-11/"
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

async function getAvailableFormatsForMonth(month: string): Promise<Map<string, string>> {
  const formatFiles = new Map<string, string>();
  
  try {
    const response = await fetch(`${SMOGON_STATS_BASE_URL}/${month}/`);
    const html = await response.text();
    
    // Parse available files from the directory listing
    // Look for patterns like href="gen9ou-1825.txt"
    const filePattern = /href="(gen9[a-z0-9-]+)-(\d+)\.txt"/g;
    let match;
    
    while ((match = filePattern.exec(html)) !== null) {
      const format = match[1];
      const rating = match[2];
      
      // Store the highest rating available for each format
      if (!formatFiles.has(format) || parseInt(rating) > parseInt(formatFiles.get(format)!)) {
        formatFiles.set(format, rating);
      }
    }
    
    console.log(`Found ${formatFiles.size} formats for month ${month}`);
  } catch (error) {
    console.error('Error fetching available formats:', error);
  }
  
  return formatFiles;
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
    // Format can be:
    // | 1    | Landorus-Therian   | 31.44185% | 520879 | 25.085% | 429408 | 25.241% |
    // or sometimes with different spacing
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
  
  console.log(`Parsed ${pokemon.length} Pokemon from stats`);
  if (pokemon.length > 0) {
    console.log(`Top 3: ${pokemon.slice(0, 3).map(p => `${p.name} (${p.usage.toFixed(2)}%)`).join(', ')}`);
  }
  
  return { totalBattles, pokemon };
}

async function fetchUsageStats(format: string, month: string, rating: string): Promise<UsageStats | null> {
  try {
    const filename = `${format}-${rating}.txt`;
    const url = `${SMOGON_STATS_BASE_URL}/${month}/${filename}`;
    
    console.log(`Fetching usage stats from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${format} stats: ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    const { totalBattles, pokemon } = parseUsageStatsText(text);
    
    if (pokemon.length === 0) {
      console.error(`No Pokemon found in ${format} stats`);
      console.log('First 500 chars of response:', text.substring(0, 500));
      return null;
    }
    
    return {
      format,
      month,
      totalBattles,
      pokemon,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching/parsing ${format} stats:`, error);
    return null;
  }
}

async function updateAllFormats() {
  const month = await getLatestMonth();
  console.log(`Updating usage stats for month: ${month}`);
  
  // Get available formats and ratings for this month
  const availableFormats = await getAvailableFormatsForMonth(month);
  
  const results: Record<string, UsageStats> = {};
  
  // Fetch stats for each format
  for (const [formatId, formatInfo] of Object.entries(FORMATS)) {
    // Skip VGC as it uses different stats
    if (formatId === 'gen9vgc2024') {
      console.log(`Skipping ${formatId} - uses different stats format`);
      continue;
    }
    
    // Check if this format is available
    const rating = availableFormats.get(formatId);
    if (!rating) {
      console.log(`No stats available for ${formatId} in ${month}`);
      continue;
    }
    
    const stats = await fetchUsageStats(formatId, month, rating);
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
    await new Promise(resolve => setTimeout(resolve, 500));
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

export { updateAllFormats, fetchUsageStats };
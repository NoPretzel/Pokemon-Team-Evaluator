import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis/client';
import { UsageStats } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    if (!format) {
      return NextResponse.json(
        { error: 'Format parameter is required' },
        { status: 400 }
      );
    }
    
    const key = `usage:${format}:current`;
    const data = await redis.get(key);
    
    if (!data) {
      const latestMonth = await redis.get('usage:latest-month');
      if (latestMonth) {
        const monthKey = `usage:${format}:${latestMonth}`;
        const monthData = await redis.get(monthKey);
        if (monthData) {
          return NextResponse.json(JSON.parse(monthData));
        }
      }
      
      return NextResponse.json(
        { error: `No usage data available for format: ${format}` },
        { status: 404 }
      );
    }
    
    const stats: UsageStats = JSON.parse(data);
    
    stats.pokemon = stats.pokemon.slice(0, 10);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { useMemo, useState } from 'react';

interface PokemonSpriteProps {
  species: string;
  shiny?: boolean;
  className?: string;
}

export function PokemonSprite({ 
  species, 
  shiny = false, 
  className = ''
}: PokemonSpriteProps) {
  const [spriteType, setSpriteType] = useState<'animated' | 'static' | 'home'>('animated');
  
  const spriteUrl = useMemo(() => {
    const baseUrl = 'https://play.pokemonshowdown.com/sprites';
    
    // Handle special forms and names
    let formattedSpecies = species
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '');
    
    // Special handling for Urshifu forms
    if (formattedSpecies === 'urshifu-rapid-strike' || formattedSpecies === 'urshifurapidstrike') {
      formattedSpecies = 'urshifu-rapidstrike';
    }
    
    // Fix other specific Pokemon names
    const nameMap: Record<string, string> = {
      'fluttermane': 'fluttermane',
      'flutter-mane': 'fluttermane',
    };
    
    if (nameMap[formattedSpecies]) {
      formattedSpecies = nameMap[formattedSpecies];
    }
    
    // Try different sprite types based on current state
    switch (spriteType) {
      case 'animated':
        const aniType = shiny ? 'ani-shiny' : 'ani';
        return `${baseUrl}/${aniType}/${formattedSpecies}.gif`;
      
      case 'static':
        const staticType = shiny ? 'gen5-shiny' : 'gen5';
        return `${baseUrl}/${staticType}/${formattedSpecies}.png`;
      
      case 'home':
        // Home sprites don't have shiny variants in the URL
        return `${baseUrl}/home-centered/${formattedSpecies}.png`;
      
      default:
        return `${baseUrl}/ani/substitute.gif`;
    }
  }, [species, shiny, spriteType]);

  return (
    <img
      src={spriteUrl}
      alt={species}
      className={className}
      loading="lazy"
      width={96}
      height={96}
      onError={() => {
        if (spriteType === 'animated') {
          setSpriteType('static');
        } else if (spriteType === 'static') {
          setSpriteType('home');
        } else {
          // All failed, will show substitute on next render
          setSpriteType('animated');
        }
      }}
    />
  );
}
import { useMemo, useState, useEffect } from 'react';

interface PokemonSpriteProps {
  species: string;
  shiny?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function PokemonSprite({ 
  species, 
  shiny = false, 
  className = ''
}: PokemonSpriteProps) {
  const [spriteType, setSpriteType] = useState<'animated' | 'static' | 'home'>('animated');
  
  // Reset sprite type when species changes
  useEffect(() => {
    setSpriteType('animated');
  }, [species]);
  
  // Reset sprite type when species changes
  useMemo(() => {
    setSpriteType('animated');
  }, [species]);
  
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
      // Add Ting-Lu and other problematic names
      'ting-lu': 'tinglu',
      'chi-yu': 'chiyu',
      'chien-pao': 'chienpao',
      'wo-chien': 'wochien',
      'ho-oh': 'hooh',
      'porygon-z': 'porygonz',
      'jangmo-o': 'jangmoo',
      'hakamo-o': 'hakamoo',
      'kommo-o': 'kommoo',
      'type-null': 'typenull',
      'mr-mime': 'mrmime',
      'mr-rime': 'mrrime',
      'mime-jr': 'mimejr',
      "farfetch'd": 'farfetchd',
      "sirfetch'd": 'sirfetchd',
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
          setSpriteType('home');
        } else if (spriteType === 'home') {
          setSpriteType('static');
        } else {
          // All failed, will show substitute on next render
          setSpriteType('animated');
        }
      }}
    />
  );
}
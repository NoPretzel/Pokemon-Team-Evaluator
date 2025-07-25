import { useMemo } from 'react';

interface ItemSpriteProps {
  item: string;
  className?: string;
}

export function ItemSprite({ item, className = '' }: ItemSpriteProps) {
  const spriteUrl = useMemo(() => {
    const baseUrl = 'https://play.pokemonshowdown.com/sprites/itemicons';
    
    const formattedItem = item.toLowerCase().replace(/[^a-z0-9]+/g, '');
    
    return `${baseUrl}/${formattedItem}.png`;
  }, [item]);

  if (!item) return null;

  return (
    <img
      src={spriteUrl}
      alt={item}
      className={className}
      loading="lazy"
      width={24}
      height={24}
      onError={(e) => {
        // Hide the image if it fails to load
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
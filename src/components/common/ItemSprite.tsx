import { useMemo } from 'react';
import { Icons } from '@pkmn/img';

interface ItemSpriteProps {
  item: string;
  className?: string;
}

export function ItemSprite({ item, className = '' }: ItemSpriteProps) {
  const spriteUrl = useMemo(() => {
    const iconData = Icons.getItem(item);
    return iconData?.url || '';
  }, [item]);

  if (!spriteUrl) return null;

  return (
    <img
      src={spriteUrl}
      alt={item}
      className={className}
      loading="lazy"
    />
  );
}
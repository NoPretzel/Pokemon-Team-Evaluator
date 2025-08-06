import { Box } from '@mantine/core';

interface TypeSpriteProps {
  type: string;
  size?: number;
  style?: React.CSSProperties;
}

export function TypeSprite({ type, size = 32, style }: TypeSpriteProps) {
  // Download sprites later
  const spriteUrl = `https://play.pokemonshowdown.com/sprites/types/${type}.png`;
  
  return (
    <Box
      component="img"
      src={spriteUrl}
      alt={`${type} type`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
        objectFit: 'contain',
        verticalAlign: 'middle',
        display: 'inline-block',
        position: 'relative',
        top: '1px',
        flexShrink: 0,
        margin: 0,
        padding: 0,
        lineHeight: 0,
        ...style
      }}
    />
  );
}
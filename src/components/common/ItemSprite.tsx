import { Box } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';

interface ItemSpriteProps {
  item: string;
  className?: string;
}

export function ItemSprite({ item, className = '' }: ItemSpriteProps) {
  if (!item) return null;

  // For now, we'll use a placeholder icon for all items
  return (
    <Box
      component="span"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        backgroundColor: 'var(--mantine-color-gray-2)',
        borderRadius: 4,
        flexShrink: 0,
      }}
      title={item}
    >
      <IconQuestionMark size={16} stroke={1.5} color="var(--mantine-color-gray-6)" />
    </Box>
  );
}
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { Theme, useTheme } from '@mui/material/styles';
import { BookSide } from '@internal/shared';

/**
 * Buy and sell are told apart by blue and orange everywhere on the Item page, a pair that stays
 * distinct with color blindness. Green and red are kept for profit and loss.
 */
export function sideColor(theme: Theme, side: BookSide): string {
  const dark = theme.palette.mode === 'dark';
  if (side === 'buy') {
    return dark ? '#4a9fe8' : '#1565c0';
  }
  return dark ? '#e0801f' : '#e65100';
}

export function profitColor(value: number): string {
  return value >= 0 ? 'success.main' : 'error.main';
}

export function SideChip({ side }: { side: BookSide }) {
  const theme = useTheme();
  const color = sideColor(theme, side);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        boxSizing: 'border-box',
        width: 44,
        borderRadius: 1,
        border: 1,
        borderColor: color,
        color,
        fontSize: 11,
        fontWeight: 'bold',
        lineHeight: '18px',
        textAlign: 'center',
        textTransform: 'uppercase',
      }}
    >
      {side}
    </Box>
  );
}

export function PanelLoading() {
  return <LinearProgress sx={{ my: 1.5 }} />;
}

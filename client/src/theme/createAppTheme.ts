import { createTheme } from '@mui/material';
import type {} from '@mui/x-charts/themeAugmentation';
import { uniqueId } from 'underscore';

const APP_BAR_HEIGHT = 40;

export type ColorMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'colorMode';

export default function createAppTheme(mode: ColorMode = 'light') {
  const isDark = mode === 'dark';
  const pageBackground = isDark ? '#121212' : '#dcdcdc';
  const paperBackground = isDark ? '#1e1e1e' : '#fff';
  const gridHover = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(220, 220, 220, .5)';
  const gridStripe = isDark
    ? 'rgba(255, 255, 255, 0.04)'
    : 'rgba(240, 240, 240, .5)';
  const gridHeader = isDark ? '#2a2a2a' : 'rgba(200, 200, 200, 1.0)';

  return createTheme({
    palette: {
      mode,
      background: {
        default: pageBackground,
        paper: paperBackground,
      },
    },
    mixins: {
      toolbar: {
        minHeight: APP_BAR_HEIGHT,
        '@media (min-width:0px) and (orientation: landscape)': {
          minHeight: APP_BAR_HEIGHT,
        },
        '@media (min-width:600px)': {
          minHeight: APP_BAR_HEIGHT,
        },
      },
    },
    components: {
      MuiToolbar: {
        styleOverrides: {
          root: {
            '@media all': {
              minHeight: APP_BAR_HEIGHT,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            height: APP_BAR_HEIGHT,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: paperBackground,
          },
        },
      },
      MuiChartsLegend: {
        styleOverrides: {
          root: {
            '& text': {
              fill: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
            },
          },
        },
      },
      MuiDataGrid: {
        defaultProps: {
          autoHeight: true,
          density: 'compact',
          getRowId: (_) => uniqueId(),
          pageSizeOptions: [100],
          rowHeight: 40,
        },
        styleOverrides: {
          root: {
            backgroundColor: paperBackground,
            color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.87)',
            '& .MuiDataGrid-row:hover': {
              backgroundColor: `${gridHover} !important`,
            },
            '& .MuiDataGrid-virtualScrollerRenderZone': {
              '& .MuiDataGrid-row': {
                '&:nth-of-type(2n)': {
                  backgroundColor: gridStripe,
                },
              },
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: gridHeader,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 'bold',
            },
          },
        },
      },
    },
  });
}

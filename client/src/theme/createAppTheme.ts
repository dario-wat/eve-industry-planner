import { createTheme } from '@mui/material';
import { uniqueId } from 'underscore';

const APP_BAR_HEIGHT = 40;

export default function createAppTheme() {
  return createTheme({
    palette: {
      background: {
        default: 'rgba(210, 210, 210, .8)',
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
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(220, 220, 220, .5) !important',
            },
            '& .MuiDataGrid-virtualScrollerRenderZone': {
              '& .MuiDataGrid-row': {
                '&:nth-of-type(2n)': {
                  // Every other row is gray
                  backgroundColor: 'rgba(240, 240, 240, .5)',
                },
              },
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(200, 200, 200, 1.0)',
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

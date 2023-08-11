import { createTheme } from '@mui/material';
import { uniqueId } from 'underscore';

export default function createAppTheme() {
  return createTheme({
    palette: {
      background: {
        default: 'rgba(210, 210, 210, .8)',
      },
    },
    components: {
      MuiToolbar: {
        styleOverrides: {
          root: {
            '@media all': {
              minHeight: 56,
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            height: '56px',
          }
        }
      },
      MuiDataGrid: {
        defaultProps: {
          autoHeight: true,
          density: 'compact',
          getRowId: _ => uniqueId(),
          pageSize: 100,
          rowHeight: 40,
          rowsPerPageOptions: [100],
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
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import type { } from '@mui/x-data-grid/themeAugmentation';
import { useContext, useState } from 'react';
import { uniqueId } from 'underscore';
import HomePageAppBar from 'components/homepage/HomePageAppBar';
import NavigationDrawer from 'components/NavigationDrawer';
import AssetsPage from 'components/AssetsPage';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import ContractsPage from 'components/ContractsPage';
import IndustryJobsPage from 'components/IndustryJobsPage';
import DashboardPage from 'components/dashboard/DashboardPage';
import { UserContext } from './UserContext';
import EveLoginButton from './EveLoginButton';

enum Tab {
  DASHBOARD = 'dashboard',
  INDUSTRY_JOBS = 'industry_jobs',
  ASSETS = 'assets',
  CONTRACTS = 'contracts',
};

// TODO
//  - fix styling (button is gray, it should be white)
//  - make datagrid header text bold
//  - render something default while it's loading, like a loding page
export default function HomePage() {

  const userContext = useContext(UserContext);
  const [selectedTab, setSelectedTab] = useState<string>(Tab.DASHBOARD);

  const theme = createTheme({
    palette: {
      background: {
        default: 'rgba(210, 210, 210, .8)',
      },
    },
    components: {
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
              // fontSize: 16,
              // fontWeight: 'bold',
            },
            // '.MuiDataGrid-columnHeaderTitle': {
            //   // fontWeight: 'bold !important',
            // },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <HomePageAppBar />
        {/* TODO 100% definitely use loading to render */}
        {userContext && userContext.character_id !== null
          ?
          <>
            <NavigationDrawer
              tabs={[
                { key: Tab.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon /> },
                { key: Tab.INDUSTRY_JOBS, label: 'Industry Jobs', icon: <ScienceIcon /> },
                { key: Tab.ASSETS, label: 'Assets', icon: <TakeoutDiningIcon /> },
                { key: Tab.CONTRACTS, label: 'Contracts', icon: <ReceiptLongIcon /> },
              ]}
              selectedTab={selectedTab}
              onClick={setSelectedTab}
            />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Toolbar /> {/* need this to push the nav bar below the app bar */}
              {selectedTab === Tab.DASHBOARD && <DashboardPage />}
              {selectedTab === Tab.INDUSTRY_JOBS && <IndustryJobsPage />}
              {selectedTab === Tab.ASSETS && <AssetsPage />}
              {selectedTab === Tab.CONTRACTS && <ContractsPage />}
            </Box>
          </>
          :
          <Box sx={{ height: 300, width: 1 }}>
            <Toolbar /> {/* need this to push the nav bar below the app bar */}
            <Box
              sx={{ height: '100%', width: 1 }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <EveLoginButton useBlack />
            </Box>
          </Box>
        }
      </Box>
    </ThemeProvider>
  );
}

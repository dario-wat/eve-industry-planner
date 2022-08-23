import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import { useState } from 'react';
import HomePageAppBar from 'components/homepage/HomePageAppBar';
import NavigationDrawer from 'components/NavigationDrawer';
import AssetsPage from 'components/AssetsPage';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import ContractsPage from 'components/ContractsPage';
import IndustryJobsPage from 'components/IndustryJobsPage';
import DashboardPage from 'components/DashboardPage';

enum Tab {
  DASHBOARD = 'dashboard',
  INDUSTRY_JOBS = 'industry_jobs',
  ASSETS = 'assets',
  CONTRACTS = 'contracts',
};

// TODO
//  - fix styling (button is gray, it should be white)
export default function HomePage() {
  const [selectedTab, setSelectedTab] = useState<string>(Tab.DASHBOARD);

  const themeLight = createTheme({
    palette: {
      background: {
        default: '#e4e4e4',
      }
    }
  });

  return (
    <ThemeProvider theme={themeLight}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <HomePageAppBar />
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
      </Box>
    </ThemeProvider>
  );
}

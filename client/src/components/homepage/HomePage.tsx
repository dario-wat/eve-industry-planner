import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { } from '@mui/x-data-grid/themeAugmentation';
import { useContext, useState } from 'react';
import HomePageAppBar from 'components/homepage/HomePageAppBar';
import NavigationDrawer from 'components/NavigationDrawer';
import AssetsPage from 'components/AssetsPage';
import { CssBaseline, ThemeProvider } from '@mui/material';
import ContractsPage from 'components/ContractsPage';
import IndustryJobsPage from 'components/IndustryJobsPage';
import DashboardPage from 'components/dashboard/DashboardPage';
import { UserContext } from 'contexts/UserContext';
import EveLoginButton from './EveLoginButton';
import createAppTheme from 'theme/createAppTheme';
import MarketTransactionsPage from 'components/MarketTransactionsPage';
import MarketOrdersPage from 'components/MarketOrdersPage';

enum Tab {
  DASHBOARD = 'dashboard',
  INDUSTRY_JOBS = 'industry_jobs',
  ASSETS = 'assets',
  CONTRACTS = 'contracts',
  MARKET_TRANSACTIONS = 'market_transactions',
  MARKET_ORDERS = 'market_orders',
};

export default function HomePage() {
  const userContext = useContext(UserContext);
  const [selectedTab, setSelectedTab] = useState<string>(Tab.DASHBOARD);

  const theme = createAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <HomePageAppBar />
        {userContext && userContext.is_logged_in
          ?
          <>
            <NavigationDrawer
              tabs={[
                { key: Tab.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon /> },
                { key: Tab.INDUSTRY_JOBS, label: 'Industry Jobs', icon: <ScienceIcon /> },
                { key: Tab.ASSETS, label: 'Assets', icon: <TakeoutDiningIcon /> },
                { key: Tab.CONTRACTS, label: 'Contracts', icon: <ReceiptLongIcon /> },
                { key: Tab.MARKET_TRANSACTIONS, label: 'Transactions', icon: <LocalGroceryStoreIcon /> },
                { key: Tab.MARKET_ORDERS, label: 'Market Orders', icon: <StorefrontIcon /> },
              ]}
              selectedTab={selectedTab}
              onTabClick={setSelectedTab}
            />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Toolbar /> {/* need this to push the nav bar below the app bar */}
              {selectedTab === Tab.DASHBOARD && <DashboardPage />}
              {selectedTab === Tab.INDUSTRY_JOBS && <IndustryJobsPage />}
              {selectedTab === Tab.ASSETS && <AssetsPage />}
              {selectedTab === Tab.CONTRACTS && <ContractsPage />}
              {selectedTab === Tab.MARKET_TRANSACTIONS && <MarketTransactionsPage />}
              {selectedTab === Tab.MARKET_ORDERS && <MarketOrdersPage />}
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

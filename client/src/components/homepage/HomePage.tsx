import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ScienceIcon from '@mui/icons-material/Science';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SleddingIcon from '@mui/icons-material/Sledding';
import SettingsIcon from '@mui/icons-material/Settings';
import type { } from '@mui/x-data-grid/themeAugmentation';
import { useContext } from 'react';
import HomePageAppBar from 'components/homepage/HomePageAppBar';
import NavigationDrawer from 'components/NavigationDrawer';
import AssetsPage from 'components/AssetsPage';
import ContractsPage from 'components/ContractsPage';
import IndustryJobsPage from 'components/IndustryJobsPage';
import DashboardPage from 'components/dashboard/DashboardPage';
import { UserContext } from 'contexts/UserContext';
import EveLoginButton from './EveLoginButton';
import { useColorMode } from 'theme/ColorModeProvider';
import MarketTransactionsPage from 'components/market_transactions/MarketTransactionsPage';
import MarketOrdersPage from 'components/MarketOrdersPage';
import { Route, Routes } from 'react-router-dom';
import MarketComparisonPage from 'components/MarketComparisonPage';
import CharactersPage from 'components/CharactersPage';
import MarketPredictionPage from 'components/market_predictions/MarketPredictionPage';
import MarketHistoryPage from 'components/market_history/MarketHistoryPage';
import SettingsPage from 'components/SettingsPage';

export default function HomePage() {
  const userContext = useContext(UserContext);
  const { mode } = useColorMode();

  const routes = [
    {
      path: '/',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      component: DashboardPage,
    },
    {
      path: '/industry_jobs',
      label: 'Industry Jobs',
      icon: <ScienceIcon />,
      component: IndustryJobsPage,
    },
    {
      path: '/assets',
      label: 'Assets',
      icon: <TakeoutDiningIcon />,
      component: AssetsPage,
    },
    {
      path: '/contracts',
      label: 'Contracts',
      icon: <ReceiptLongIcon />,
      component: ContractsPage,
    },
    {
      path: '/transactions',
      label: 'Transactions',
      icon: <LocalGroceryStoreIcon />,
      component: MarketTransactionsPage,
    },
    {
      path: '/market_prediction',
      label: 'Market Prediction',
      icon: <AttachMoneyIcon />,
      component: MarketPredictionPage,
    },
    {
      path: '/market_history',
      label: 'Market History',
      icon: <ShowChartIcon />,
      component: MarketHistoryPage,
    },
    {
      path: '/market_orders',
      label: 'Market Orders',
      icon: <StorefrontIcon />,
      component: MarketOrdersPage,
    },
    {
      path: '/market_comparison',
      label: 'Market Comparison',
      icon: <CompareArrowsIcon />,
      component: MarketComparisonPage,
    },
    {
      path: '/character_settings',
      label: 'Characters',
      icon: <SleddingIcon />,
      component: CharactersPage,
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      component: SettingsPage,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <HomePageAppBar />
      {userContext && userContext.is_logged_in
        ?
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <NavigationDrawer routes={routes} />
          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              p: 1,
              overflow: 'hidden',
              bgcolor: 'background.default',
              color: 'text.primary',
            }}
          >
            <Routes>
              {routes.map((route: any) =>
                <Route
                  path={route.path}
                  key={route.path}
                  element={<route.component />} />
              )}
            </Routes>
          </Box>
        </Box>
        :
        <Box
          sx={{ flex: 1, width: 1, bgcolor: 'background.default', color: 'text.primary' }}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <EveLoginButton useBlack={mode === 'light'} />
        </Box>
      }
    </Box>
  );
}
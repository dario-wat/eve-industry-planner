import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { } from '@mui/x-data-grid/themeAugmentation';
import { useContext } from 'react';
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
import { Route, Routes } from 'react-router-dom';
import MarketComparisonPage from 'components/MarketComparisonPage';

export default function HomePage() {
  const userContext = useContext(UserContext);

  const theme = createAppTheme();

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
      path: '/market_orders',
      label: 'Market Orders',
      icon: <StorefrontIcon />,
      component: MarketOrdersPage,
    },
    {
      path: '/market_comparison',
      label: 'Marker Comparison',
      icon: <StorefrontIcon />,
      component: MarketComparisonPage,
    },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <HomePageAppBar />
        {userContext && userContext.is_logged_in
          ?
          <>
            <NavigationDrawer routes={routes} />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Toolbar /> {/* need this to push the nav bar below the app bar */}
              <Routes>
                {routes.map((route: any) =>
                  <Route
                    path={route.path}
                    key={route.path}
                    element={<route.component />} />
                )}
              </Routes>
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
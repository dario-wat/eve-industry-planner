import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import { useState } from 'react';
import HomePageAppBar from 'components/homepage/HomePageAppBar';
import NavigationDrawer from 'components/NavigationDrawer';
import AssetsPage from 'components/AssetsPage';
import { TextField } from '@mui/material';

// TODO
//  1. Enum for tabs
export default function HomePage() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  return (
    <Box sx={{ display: 'flex' }}>
      <HomePageAppBar />
      <NavigationDrawer
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
          { key: 'industry_jobs', label: 'Industry Jobs', icon: <ScienceIcon /> },
          { key: 'assets', label: 'Assets', icon: <TakeoutDiningIcon /> },
          { key: 'contracts', label: 'Contracts', icon: <ReceiptLongIcon /> },
        ]}
        selectedTab={selectedTab}
        onClick={setSelectedTab}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* need this to push the nav bar below the app bar */}
        {selectedTab === 'dashboard' &&
          <TextField
            label="Search..."
            variant="outlined"
            value={'bs'}
          // onChange={e => setSearchText(e.target.value)}
          />
        }
        {selectedTab === 'industry_jobs' &&
          <Typography paragraph>
            Indsutry Jobs
          </Typography>
        }
        {selectedTab === 'assets' &&
          <AssetsPage />
        }
        {selectedTab === 'contracts' &&
          <Typography paragraph>
            Contracts
          </Typography>
        }
      </Box>
    </Box>
  );
}

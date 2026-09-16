import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import DashboardProductionPlanCard from './DashboardProductionPlanCard';
import DashboardProductsCard from './DashboardProductsCard';
import DashboardConfigurationCard from './DashboardConfigurationCard';

export default function DashboardPage() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Box sx={{ pb: 4 }}>
          <DashboardProductsCard />
        </Box>
        <DashboardConfigurationCard />
      </Grid>
      <Grid item xs={6}>
        <DashboardProductionPlanCard />
      </Grid>
    </Grid>
  );
}
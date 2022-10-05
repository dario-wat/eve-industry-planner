import Grid from '@mui/material/Grid';
import DashboardProductionPlanCard from './DashboardProductionPlanCard';
import DashboardProductsCard from './DashboardProductsCard';
import DashboardScribblesCard from './DashboardScribblesCard';
import DashboardStationSelectCard from './DashboardStationSelectCard';

// TODO make nicer
export default function DashboardPage() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <DashboardProductsCard />
      </Grid>
      <Grid item xs={6}>
        <DashboardProductionPlanCard />
      </Grid>
      <Grid item xs={5}>
        <DashboardStationSelectCard />
      </Grid>
      <Grid item xs={6}>
        <DashboardScribblesCard />
      </Grid>
    </Grid>
  );
}
import { Card, CardContent, Grid } from '@mui/material';
import DashboardProductionPlanCard from './DashboardProductionPlanCard';
import DashboardProductsCard from './DashboardProductsCard';
import DashboardStationSelectCard from './DashboardStationSelectCard';

export default function DashboardPage() {
  return (
    <Grid container spacing={2}>
      <Grid item xs={5}>
        <DashboardProductsCard />
      </Grid>
      <Grid item xs={6}>
        <DashboardProductionPlanCard />
      </Grid>
      <Grid item xs={5}>
        <DashboardStationSelectCard />
      </Grid>
      <Grid item xs={6}>
        <Card>
          <CardContent>
            Something will go here
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
import { Card, CardContent, Grid } from '@mui/material';
import DashboardProductsCard from './DashboardProductsCard';
import DashboardStationSelectCard from './DashboardStationSelectCard';

export default function DashboardPage() {
  const Item = (
    <Card>
      <CardContent>
        card
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2}>
      <Grid item xs={5}>
        <DashboardProductsCard />
      </Grid>
      <Grid item xs={6}>
        <DashboardStationSelectCard />
      </Grid>
      <Grid item xs={4}>
        {Item}
      </Grid>
      <Grid item xs={8}>
        {Item}
      </Grid>
    </Grid>
  );
}
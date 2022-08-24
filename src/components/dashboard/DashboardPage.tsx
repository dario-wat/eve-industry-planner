import { Card, CardContent, Grid } from '@mui/material';
import DashboardProductsCard from './DashboardProductsCard';

export default function DashboardPage() {
  // const Item = styled(Paper)(({ theme }) => ({
  //   backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  //   ...theme.typography.body2,
  //   padding: theme.spacing(1),
  //   textAlign: 'center',
  //   color: theme.palette.text.secondary,
  // }));
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
        {Item}
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
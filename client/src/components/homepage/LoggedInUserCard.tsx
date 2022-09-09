import { useContext } from 'react';
import { UserContext } from './UserContext';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import useAxios from 'axios-hooks';
import { styled } from '@mui/system';

const CARD_WIDTH = 170;

// TODO make it look nicer
export default function LoggedInUserCard() {
  const [{ data }] = useAxios('/portrait');

  const userContext = useContext(UserContext);

  const CardContentNoPadding = styled(CardContent)(`
    padding: 8px;
    &:last-child {
      padding-bottom: 8px;
    }
  `);
  return (
    <Box sx={{ width: CARD_WIDTH, display: { xs: 'none', sm: 'block' } }}>
      <Card>
        <CardContentNoPadding>
          <Grid container sx={{ alignItems: 'center' }}>
            <Grid item xs={3} sx={{ pr: 1 }}>
              {data &&
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center">
                  <img
                    src={data.px64x64}
                    alt="Portrait"
                    width={32}
                    height={32}
                  />
                </Box>
              }
            </Grid>
            <Grid item xs={9}>
              {userContext &&
                <Typography variant="body2">
                  {userContext.character_name}
                </Typography>}
            </Grid>
          </Grid>
        </CardContentNoPadding>
      </Card>
    </Box>
  );
}
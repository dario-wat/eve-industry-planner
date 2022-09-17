import { useContext } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import useAxios from 'axios-hooks';
import { styled } from '@mui/system';
import { UserContext } from 'contexts/UserContext';
import { EvePortraitRes } from '@internal/shared';
import CenteredImg from 'components/util/CenteredImg';

export default function LoggedInUserCard() {
  const [{ data }] = useAxios<EvePortraitRes>('/portrait');

  const userContext = useContext(UserContext);

  const CardContentNoPadding = styled(CardContent)(`
    padding: 4px;
    &:last-child {
      padding-bottom: 4px;
    }
  `);
  return (
    <Box sx={{ width: 170, display: { xs: 'none', sm: 'block' } }}>
      <Card>
        <CardContentNoPadding style={{ backgroundColor: '#d9d9d9' }}>
          <Grid container sx={{ alignItems: 'center' }}>
            <Grid item xs={3} sx={{ pr: 1 }}>
              {data &&
                <CenteredImg
                  src={data.px64x64}
                  alt="Portrait"
                  width={32}
                  height={32}
                />
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
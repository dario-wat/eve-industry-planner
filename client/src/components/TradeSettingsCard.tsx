import axios from 'axios';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { TradeSettingsRes } from '@internal/shared';

/** Where you place buy orders and sell orders. Used by every trade view. */
export default function TradeSettingsCard() {
  const [{ data }, refetch] = useAxios<TradeSettingsRes | null>('/trade_settings');
  const [saveError, setSaveError] = useState(false);

  const save = async (stations: { buyLocationId: number; sellLocationId: number }) => {
    setSaveError(false);
    try {
      await axios.post('/trade_settings', stations);
      useAxios.clearCache();
      await refetch();
    } catch {
      setSaveError(true);
    }
  };

  const stationField = (label: string, value: number, onChange: (locationId: number) => void) => (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      fullWidth
    >
      {data?.locations.map(l => (
        <MenuItem key={l.locationId} value={l.locationId}>
          {l.name ?? `Location ${l.locationId}`}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Card sx={{ maxWidth: 420 }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Trading
        </Typography>
        {data == null
          ? <Typography variant="body2" color="text.secondary">Loading…</Typography>
          : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {stationField('Buy station', data.buyLocationId, buyLocationId =>
                save({ buyLocationId, sellLocationId: data.sellLocationId }))}
              {stationField('Sell station', data.sellLocationId, sellLocationId =>
                save({ buyLocationId: data.buyLocationId, sellLocationId }))}
              {saveError && <Alert severity="error">Could not save the stations.</Alert>}
            </Box>
          )
        }
      </CardContent>
    </Card>
  );
}

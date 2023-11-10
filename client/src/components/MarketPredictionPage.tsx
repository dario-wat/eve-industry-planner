import { useState } from 'react';
import { Box, Card, CardContent, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import axios from 'axios';
import { MarketHistoryRes } from '@internal/shared';

// TODO
// - ID selection or multi use
// - Or just go through everything
// - Scheduled job to check things out

export default function MarketPredictionPage() {
  const [idText, setIdText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyData, setHistoryData] = useState<MarketHistoryRes | null>(null);

  const onSubmit = async () => {
    setIsLoading(true);
    const { data } = await axios.get<MarketHistoryRes>(`/market_history/${idText}`);
    setHistoryData(data);
    setIsLoading(false);
  };
  return (
    <div>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <TextField
              label="ID"
              variant="outlined"
              value={idText}
              onChange={e => setIdText(e.target.value)}
            />
            <LoadingButton
              loading={isLoading}
              variant="contained"
              color="primary"
              onClick={onSubmit}
            >
              Submit
            </LoadingButton>
          </Box>
          <Box
            sx={{ height: 'auto', width: '100%' }}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            {/* TODO what here */}
            {historyData?.map(d => d.iskVolume)}
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}
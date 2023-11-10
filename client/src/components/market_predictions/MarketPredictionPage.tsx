import { useState } from 'react';
import { Box, Card, CardContent, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import axios from 'axios';
import { MarketHistoryRes } from '@internal/shared';
import { ChartContainer, LinePlot, ChartsYAxis, ChartsXAxis, BarPlot } from '@mui/x-charts';
import { format } from 'date-fns';
import { max, min } from 'mathjs';
import { formatNumberScale } from '../util/numbers';
import { createHeuristic } from './MarketItemScores';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

// TODO
// - ID selection or multi use
// - Or just go through everything
// - Scheduled job to check things out
// - Input typeahead name ?

const scoreColumns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 200,
  },
  {
    field: 'value',
    headerName: 'Value',
    width: 150,
  },
  {
    field: 'value_3_days',
    headerName: 'Value (last 3 days)',
    width: 150,
  },
];

export default function MarketPredictionPage() {
  const [idText, setIdText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyData, setHistoryData] = useState<MarketHistoryRes | null>(null);

  const onSubmit = async () => {
    setIsLoading(true);
    const { data } = await axios.get<MarketHistoryRes>(`/market_history/${idText}`);
    setHistoryData(data.sort((a, b) => a.date.localeCompare(b.date)));
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
          {historyData &&
            <Box
              sx={{ height: 'auto', width: '100%' }}
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <ChartContainer
                width={1000}
                height={500}
                series={[
                  {
                    type: 'line',
                    yAxisKey: 'line',
                    data: historyData.map(h => h.highest),
                    label: 'Highest',
                    color: 'green',
                    showMark: false,
                  },
                  {
                    type: 'line',
                    yAxisKey: 'line',
                    data: historyData.map(h => h.lowest),
                    label: 'Lowest',
                    color: 'red',
                    showMark: false,
                  },
                  {
                    type: 'line',
                    yAxisKey: 'line',
                    data: historyData.map(h => h.average),
                    label: 'Average',
                    color: 'orange',
                    showMark: false,
                  },
                  {
                    type: 'bar',
                    yAxisKey: 'bar',
                    data: historyData.map(h => h.volume),
                    color: 'green',
                  },
                ]}
                xAxis={[
                  {
                    id: 'time',
                    scaleType: 'band',
                    data: historyData.map(h => new Date(h.date)),
                    valueFormatter: date => format(date, 'yyyy-MM-dd'),
                  }
                ]}
                yAxis={[
                  {
                    id: 'line',
                    scaleType: 'linear',
                    min: 0.9 * min(historyData.map(h => h.lowest)),
                    // max: 0.98 * max(historyData.map(h => h.highest))
                    valueFormatter: num => formatNumberScale(num),
                  },
                  {
                    id: 'bar',
                    scaleType: 'linear',
                    max: 4 * max(historyData.map(h => h.volume)),
                  },
                ]}
              >
                <BarPlot />
                <LinePlot />
                <ChartsYAxis position="left" axisId="line" />
                <ChartsYAxis position="right" axisId="bar" />
                <ChartsXAxis position="bottom" axisId="time" />
              </ChartContainer>
            </Box>
          }
          {historyData &&
            <Box sx={{ p: 4 }}>
              <DataGrid
                sx={{ width: 550 }}
                initialState={{
                  sorting: {
                    sortModel: [{ field: 'date', sort: 'desc' }],
                  },
                }}
                rows={createHeuristic(historyData)}
                columns={scoreColumns}
                disableSelectionOnClick
                disableColumnMenu
              />
            </Box>
          }
        </CardContent>
      </Card>
    </div >
  );
}
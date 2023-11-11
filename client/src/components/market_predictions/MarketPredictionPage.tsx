import { Card, CardContent } from '@mui/material';
import MarketItemHistoryDataTab from './MarketItemHistoryDataTab';

export default function MarketPredictionPage() {
  return (
    <div>
      <Card>
        <CardContent>
          <MarketItemHistoryDataTab />
        </CardContent>
      </Card>
    </div >
  );
}
import { Card, CardContent, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import MarketItemHistoryDataTab from './MarketItemHistoryDataTab';
import MarketabiltyTab from './MarketabilityTab';

enum SelectedTab {
  MARKETABILITY = 'MARKETABILITY',
  HISTORY = 'HISTORY',
};

export default function MarketPredictionPage() {
  const [selectedTab, setSelectedTab] = useState(SelectedTab.HISTORY);
  return (
    <div>
      <Card>
        <CardContent>
          <Tabs
            sx={{
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
          >
            <Tab label="History" value={SelectedTab.HISTORY} />
            <Tab label="Marketabilty" value={SelectedTab.MARKETABILITY} />
          </Tabs>
          {selectedTab === SelectedTab.HISTORY &&
            <MarketItemHistoryDataTab />
          }
          {selectedTab === SelectedTab.MARKETABILITY &&
            <MarketabiltyTab />
          }
        </CardContent>
      </Card>
    </div >
  );
}
import useAxios from 'axios-hooks';
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import { WalletTransactionsRes } from '@internal/shared';
import { isAfter, isBefore } from 'date-fns';
import { DesktopDatePicker, LocalizationProvider, enUS } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Grid, Tab, Tabs } from '@mui/material';
import AllMarketTransactionsDataGrid from './AllMarketTransactionsDataGrid';
import AggregatedTransactionsDataGrid from './AggregatedTransactionsDataGrid';
import OverallTransactionCharts from './OverallTransactionCharts';
import { LoadingButton } from '@mui/lab';
import { useMarketTransactionsStore } from './marketTransactionsStore';
import WorkspacePage, { WorkspaceFill, WorkspaceSpinner } from 'components/util/WorkspacePage';

enum SelectedTab {
  TRANSACTIONS = 'TRANSACTIONS',
  AGGREGATED = 'AGGREGATED',
  OVERALL = 'OVERALL',
};

export default function MarketTransactionsPage() {
  const [{ data, loading }, refetch] =
    useAxios<WalletTransactionsRes>('/wallet_transactions');

  const {
    searchText, setSearchText,
    startDate, setStartDate,
    endDate, setEndDate,
  } = useMarketTransactionsStore();

  const [selectedTab, setSelectedTab] = useState(SelectedTab.AGGREGATED);

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
    (
      (d.name && isIncluded(d.name))
      || (d.locationName && isIncluded(d.locationName))
    )
    && isBefore(new Date(d.date), endDate)
    && isAfter(new Date(d.date), startDate)
  );

  return (
    <WorkspacePage>
      <Grid container spacing={2} alignItems="center" sx={{ pb: 1, flexShrink: 0 }}>
        <Grid item>
          <TextField
            label="Search"
            variant="outlined"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </Grid>
        <Grid item>
          <LocalizationProvider
            localeText={enUS.components.MuiLocalizationProvider.defaultProps.localeText}
            dateAdapter={AdapterDateFns}>
            <DesktopDatePicker
              label="Start Date"
              value={startDate}
              onChange={newValue => newValue && setStartDate(newValue)}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item>
          <LocalizationProvider
            localeText={enUS.components.MuiLocalizationProvider.defaultProps.localeText}
            dateAdapter={AdapterDateFns}>
            <DesktopDatePicker
              label="End Date"
              value={endDate}
              onChange={newValue => newValue && setEndDate(newValue)}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item>
          <LoadingButton
            loading={loading}
            variant="contained"
            onClick={() => refetch()}
          >
            Refresh
          </LoadingButton>
        </Grid>
      </Grid>
      <Tabs
        sx={{
          mb: 1,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
      >
        <Tab label="Aggregated" value={SelectedTab.AGGREGATED} />
        <Tab label="Transactions" value={SelectedTab.TRANSACTIONS} />
        <Tab label="Overall" value={SelectedTab.OVERALL} />
      </Tabs>
      <WorkspaceFill>
        {filteredData
          ? (
            <>
              {selectedTab === SelectedTab.AGGREGATED &&
                <AggregatedTransactionsDataGrid data={filteredData} />
              }
              {selectedTab === SelectedTab.TRANSACTIONS &&
                <AllMarketTransactionsDataGrid data={filteredData} />
              }
              {selectedTab === SelectedTab.OVERALL &&
                <OverallTransactionCharts data={filteredData} />
              }
            </>
          )
          : <WorkspaceSpinner />
        }
      </WorkspaceFill>
    </WorkspacePage>
  );
}

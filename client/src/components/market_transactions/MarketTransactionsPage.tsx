import useAxios from 'axios-hooks';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { WalletTransactionsRes } from '@internal/shared';
import { isAfter, isBefore } from 'date-fns';
import { DesktopDatePicker, LocalizationProvider, enUS } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Grid, MenuItem, Select, Tab, Tabs } from '@mui/material';
import AllMarketTransactionsDataGrid from './AllMarketTransactionsDataGrid';
import AggregatedTransactionsDataGrid from './AggregatedTransactionsDataGrid';
import { uniq } from 'underscore';
import OverallTransactionDataGrid from './OverallTransactionDataGrid';
import { LoadingButton } from '@mui/lab';
import FeesAndTaxesDataGrid from './FeesAndTaxesDataGrid';
import { ALL_CHARACTERS } from './marketTransactionsStore';
import { useMarketTransactionsStore } from './marketTransactionsStore';

enum SelectedTab {
  TRANSACTIONS = 'TRANSACTIONS',
  AGGREGATED = 'AGGREGATED',
  OVERALL = 'OVERALL',
  FEES_AND_TAXES = 'FEES_AND_TAXES',
};

export default function MarketTransactionsPage() {
  const [{ data, loading }, refetch] =
    useAxios<WalletTransactionsRes>('/wallet_transactions');

  const characterNames = uniq(data?.map(d => d.characterName) ?? []);

  const {
    searchText, setSearchText,
    startDate, setStartDate,
    endDate, setEndDate,
    selectedCharacter, setSelectedCharacter,
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
    && (selectedCharacter === ALL_CHARACTERS || selectedCharacter === d.characterName)
  );

  return (
    <div>
      <Grid container spacing={2} alignItems="center" sx={{ pb: 2 }}>
        <Grid item>
          <TextField
            InputProps={{
              sx: {
                backgroundColor: 'white',
              }
            }}
            label="Search..."
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
              sx={{ backgroundColor: 'white' }}
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
              sx={{ backgroundColor: 'white' }}
              label="End Date"
              value={endDate}
              onChange={newValue => newValue && setEndDate(newValue)}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item>
          <Select
            sx={{ width: 250, backgroundColor: 'white' }}
            value={selectedCharacter}
            onChange={event => setSelectedCharacter(event.target.value)}
            label="Character"
          >
            <MenuItem value={ALL_CHARACTERS}>All</MenuItem>
            {characterNames.map(name =>
              <MenuItem key={name} value={name}>{name}</MenuItem>
            )}
          </Select>
        </Grid>
        <Grid item>
          <LoadingButton
            sx={{ height: '40px' }}
            loading={loading}
            variant="contained"
            size="small"
            onClick={() => refetch()}
          >
            Refresh
          </LoadingButton>
        </Grid>
      </Grid>
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
            <Tab label="Aggregated" value={SelectedTab.AGGREGATED} />
            <Tab label="Transactions" value={SelectedTab.TRANSACTIONS} />
            <Tab label="Overall" value={SelectedTab.OVERALL} />
            <Tab label="Fees And Taxes" value={SelectedTab.FEES_AND_TAXES} />
          </Tabs>
          <Box
            sx={{ height: 'auto', width: '100%' }}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
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
                    <OverallTransactionDataGrid data={filteredData} />
                  }
                  {selectedTab === SelectedTab.FEES_AND_TAXES &&
                    <FeesAndTaxesDataGrid />
                  }
                </>
              )
              : <CircularProgress />
            }
          </Box>
        </CardContent>
      </Card>
    </div >
  );
}

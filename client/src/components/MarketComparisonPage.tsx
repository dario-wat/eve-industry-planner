import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { isNaN } from 'underscore';

export default function MarketComparisonPage() {
  const [marketExport1, setMarketExport1] = useState('');
  const [marketExport2, setMarketExport2] = useState('');

  const items1: { [k: string]: string[] } = marketExport1 === '' ? {} :
    marketExport1.split('\n')
      .map(line => line.split('\t'))
      .slice(0, -1)
      .reduce((obj: { [k: string]: string[] }, tuple) => {
        obj[tuple[0]] = tuple;
        return obj;
      }, {});
  const items2: { [k: string]: string[] } = marketExport1 === '' ? {} :
    marketExport2.split('\n')
      .map(line => line.split('\t'))
      .slice(0, -1)
      .reduce((obj: { [k: string]: string[] }, tuple) => {
        obj[tuple[0]] = tuple;
        return obj;
      }, {});

  const buy1: [string, string][] = [];
  const buy2: [string, string][] = [];
  Object.entries(items1).forEach(([itemName1, itemData1]) => {
    const itemData2 = items2[itemName1];
    if (itemData2 === undefined) {
      buy1.push([itemData1[0], itemData1[1]]);
      return;
    }

    const price1 = parseFloat(itemData1[2].replace(/,/g, ''))
    const price2 = parseFloat(itemData2[2].replace(/,/g, ''))

    if (isNaN(price2) || price1 < price2) {
      buy1.push([itemData1[0], itemData1[1]]);
    } else {
      buy2.push([itemData2[0], itemData2[1]]);
    }
  });
  Object.entries(items2).forEach(([itemName2, itemData2]) => {
    const itemData1 = items1[itemName2];
    if (itemData1 === undefined) {
      buy1.push([itemData2[0], itemData2[1]]);
      return;
    }
  });

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField
          InputProps={{
            sx: {
              backgroundColor: 'white',
            }
          }}
          fullWidth
          multiline
          rows={15}
          placeholder="Market Export 1"
          value={marketExport1}
          onChange={e => setMarketExport1(e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          InputProps={{
            sx: {
              backgroundColor: 'white',
            }
          }}
          fullWidth
          multiline
          rows={15}
          placeholder="Market Export 2"
          value={marketExport2}
          onChange={e => setMarketExport2(e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          InputProps={{
            sx: {
              backgroundColor: 'white',
            },
            readOnly: true,
          }}
          fullWidth
          multiline
          rows={15}
          placeholder="Buy 1"
          value={buy1.map(b => `${b[0]} ${b[1]}`).join('\n')}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          InputProps={{
            sx: {
              backgroundColor: 'white',
            },
            readOnly: true,
          }}
          fullWidth
          multiline
          rows={15}
          placeholder="Buy 2"
          value={buy2.map(b => `${b[0]} ${b[1]}`).join('\n')}
        />
      </Grid>
    </Grid>
  );
}
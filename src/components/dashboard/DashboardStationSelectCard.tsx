import { Autocomplete, Card, CardContent, TextField } from '@mui/material';
import useAxios from 'axios-hooks';
import { uniq } from 'underscore';


// replace indexify with unique id
export default function DashboardStationSelectCard() {
  // TODO(EIP-20) this is used in multiple places. That shouldn't be the case
  // I should somehow memoize this
  const [{ data }] = useAxios('/assets');
  const locations = data && uniq(data, d => d.location_id);

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        <Autocomplete
          multiple
          options={locations || []}
          getOptionLabel={(option: any) => option.location}
          filterSelectedOptions
          renderInput={(params) => (
            <TextField
              {...params}
              label="Stations"
              placeholder="Stations"
            />
          )}
        />
      </CardContent>
    </Card>
  );
}
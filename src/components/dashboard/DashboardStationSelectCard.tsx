import { Autocomplete, Card, CardContent, TextField } from '@mui/material';
import useAxios from 'axios-hooks';
import { uniq } from 'underscore';


// replace indexify with unique id
export default function DashboardStationSelectCard() {
  // TODO(EIP-20) this is used in multiple places. That shouldn't be the case
  // I should somehow memoize this
  // const [{ data }] = useAxios('/assets');
  // console.log(data);
  // // console.log(uniq(data.map((d: any) => d.location_id)))
  // const locations = data && uniq(
  //   data,
  //   false,
  //   data.map((d: any) => d.location_id),
  // );
  // console.log(locations);

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        {/* <Autocomplete
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
        /> */}
      </CardContent>
    </Card>
  );
}
import { Autocomplete, Card, CardContent, TextField } from "@mui/material";

export default function DashboardStationSelectCard() {

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        {/* <Autocomplete
          multiple
          options={top100Films}
          getOptionLabel={(option) => option.title}
          defaultValue={[top100Films[13]]}
          filterSelectedOptions
          renderInput={(params) => (
            <TextField
              {...params}
              label="filterSelectedOptions"
              placeholder="Favorites"
            />
          )}
        /> */}
      </CardContent>
    </Card>
  );
}
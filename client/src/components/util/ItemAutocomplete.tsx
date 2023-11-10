import { EveSdeTypesRes } from '@internal/shared';
import useAxios from 'axios-hooks';
import Typography from '@mui/material/Typography';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export default function ItemAutocomplete(props: {
  onInputChange: (value: string) => void,
}) {
  const [{ data, loading }] = useAxios<EveSdeTypesRes>('/type_ids_items');
  const autocompleteData = data && data.map(t => ({
    label: t.name,
    id: t.id,
  }));

  return (
    <Autocomplete
      sx={{ width: 280 }}
      disablePortal
      loading={loading}
      options={autocompleteData ?? []}
      filterOptions={createFilterOptions({ matchFrom: 'any', limit: 10 })}
      isOptionEqualToValue={(option: any, value: any) =>
        option.id === value.id
      }
      renderOption={(props, option: any) =>
        <li
          {...props}
          style={{
            paddingLeft: '8px',
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {option.label}
          </Typography>
        </li>
      }
      renderInput={(params) =>
        <TextField
          {...params}
          sx={{ verticalAlign: 'inherit' }}
          label="Item"
          variant="standard" />
      }
      onInputChange={(_, value) => props.onInputChange(value)}
    />
  );
}
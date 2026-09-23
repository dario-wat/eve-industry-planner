import { EveSdeTypesRes } from '@internal/shared';
import useAxios from 'axios-hooks';
import Typography from '@mui/material/Typography';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import EveIcon from 'components/util/EveIcon';

export default function ItemAutocomplete(props: {
  onInputChange: (value: string) => void,
  width?: number,
}) {
  const [{ data, loading }] = useAxios<EveSdeTypesRes>('/type_ids_items');
  const autocompleteData = data?.map(t => ({
    label: t.name,
    id: t.id,
  })) ?? [];

  return (
    <Autocomplete
      sx={{ width: props.width ?? 280 }}
      disablePortal
      loading={loading}
      options={autocompleteData}
      filterOptions={createFilterOptions({ matchFrom: 'any', limit: 10 })}
      ListboxProps={{ style: { maxHeight: 'none' } }}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderOption={(props, option) =>
        <li
          {...props}
          style={{
            paddingLeft: '8px',
            paddingTop: '2px',
            paddingBottom: '2px',
            gap: '8px',
          }}
        >
          <EveIcon typeId={option.id} size={24} />
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
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
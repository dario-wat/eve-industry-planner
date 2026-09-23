import { EveSdeTypesRes } from '@internal/shared';
import useAxios from 'axios-hooks';
import Typography from '@mui/material/Typography';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import EveIcon from 'components/util/EveIcon';

export default function ItemAutocomplete(props: {
  onInputChange: (value: string) => void;
  width?: number;
}) {
  const [{ data, loading }] = useAxios<EveSdeTypesRes>('/type_ids_items');
  const autocompleteData =
    data?.map((t) => ({
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
      renderOption={(props, option, state) => (
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
            {highlightMatch(option.label, state.inputValue)}
          </Typography>
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} sx={{ verticalAlign: 'inherit' }} label="Item" variant="standard" />
      )}
      onInputChange={(_, value) => props.onInputChange(value)}
    />
  );
}

function highlightMatch(label: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return label;
  }
  const haystack = label.toLowerCase();
  const parts: (string | JSX.Element)[] = [];
  let cursor = 0;
  let matchAt = haystack.indexOf(needle);
  while (matchAt !== -1) {
    if (matchAt > cursor) {
      parts.push(label.slice(cursor, matchAt));
    }
    parts.push(
      <span key={matchAt} style={{ backgroundColor: '#fff3a0' }}>
        {label.slice(matchAt, matchAt + needle.length)}
      </span>,
    );
    cursor = matchAt + needle.length;
    matchAt = haystack.indexOf(needle, cursor);
  }
  if (cursor < label.length) {
    parts.push(label.slice(cursor));
  }
  return parts;
}

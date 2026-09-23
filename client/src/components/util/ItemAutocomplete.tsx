import { useState } from 'react';
import { EveSdeTypesRes } from '@internal/shared';
import useAxios from 'axios-hooks';
import Typography from '@mui/material/Typography';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import EveIcon from 'components/util/EveIcon';

type ItemOption = { label: string; id: number };

const RECENT_STORAGE_KEY = 'itemAutocomplete.recentTypeIds';
const RECENT_LIMIT = 10;
const filterItems = createFilterOptions<ItemOption>({ matchFrom: 'any', limit: 10 });

export default function ItemAutocomplete(props: {
  onInputChange: (value: string) => void;
  width?: number;
}) {
  const [{ data, loading }] = useAxios<EveSdeTypesRes>('/type_ids_items');
  const [inputValue, setInputValue] = useState('');
  const [recentIds, setRecentIds] = useState(readRecentTypeIds);
  const autocompleteData =
    data?.map((t) => ({
      label: t.name,
      id: t.id,
    })) ?? [];

  const remember = (id: number) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((existing) => existing !== id)].slice(0, RECENT_LIMIT);
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <Autocomplete
      sx={{ width: props.width ?? 280 }}
      openOnFocus
      loading={loading}
      options={autocompleteData}
      filterOptions={(options, state) =>
        state.inputValue.trim() ? filterItems(options, state) : recentOptions(options, recentIds)
      }
      ListboxProps={{ style: { maxHeight: 'none' } }}
      noOptionsText={inputValue.trim() ? 'No matching items' : 'Type to search items'}
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
      onInputChange={(_, value) => {
        setInputValue(value);
        props.onInputChange(value);
      }}
      onChange={(_, value) => {
        if (value) {
          remember(value.id);
        }
      }}
    />
  );
}

function readRecentTypeIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is number => typeof id === 'number').slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function recentOptions(options: ItemOption[], recentIds: number[]): ItemOption[] {
  const byId = new Map(options.map((option) => [option.id, option]));
  return recentIds.flatMap((id) => {
    const option = byId.get(id);
    return option ? [option] : [];
  });
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

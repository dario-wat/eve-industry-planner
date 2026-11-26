import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GroupIcon from '@mui/icons-material/Group';
import axios from 'axios';
import useAxios from 'axios-hooks';
import { MouseEvent, useState } from 'react';
import { LinkedCharacterRes } from '@internal/shared';

type Character = LinkedCharacterRes[number];

type Props = {
  onSelectionChange: () => void,
};

export default function CharacterSelectorListItem({ onSelectionChange }: Props) {
  const [{ data }, refetch] = useAxios<LinkedCharacterRes>('/linked_characters');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const characters = data ?? [];
  const selected = characters.filter(c => c.selected);

  const onOpen = (event: MouseEvent<HTMLElement>) => {
    setDraftIds(selected.map(c => c.characterId));
    setAnchorEl(event.currentTarget);
  };

  // Applied on close rather than per click, since every view refetches from ESI.
  const onClose = async () => {
    setAnchorEl(null);
    const unchanged = draftIds.length === selected.length
      && selected.every(c => draftIds.includes(c.characterId));
    if (unchanged) {
      return;
    }
    setSaving(true);
    try {
      await axios.post('/selected_characters', { characterIds: draftIds });
      useAxios.clearCache();
      await refetch();
      onSelectionChange();
    } finally {
      setSaving(false);
    }
  };

  const toggle = (characterId: number) => setDraftIds(ids =>
    ids.includes(characterId) ? ids.filter(id => id !== characterId) : [...ids, characterId]);
  const allSelected = draftIds.length === characters.length;

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          selected={anchorEl !== null}
          disabled={data === undefined || saving}
          onClick={onOpen}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: '12px' }}>
            {selected.length === 1
              ? <CharacterAvatar character={selected[0]} size={20} />
              : <GroupIcon sx={{ fontSize: 20 }} />
            }
          </ListItemIcon>
          <ListItemText
            primary={selected.length === 1
              ? selected[0].characterName
              : `${selected.length} characters`}
            primaryTypographyProps={{ noWrap: true }}
          />
          {saving
            ? <CircularProgress size={16} />
            : <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          }
        </ListItemButton>
      </ListItem>
      <Popover
        open={anchorEl !== null}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { ml: 0.5, minWidth: 240, maxHeight: '70vh' } } }}
      >
        <List dense disablePadding>
          <ListItemButton
            disabled={allSelected}
            onClick={() => setDraftIds(characters.map(c => c.characterId))}
          >
            <Checkbox
              edge="start"
              size="small"
              disableRipple
              checked={allSelected}
              indeterminate={!allSelected}
              sx={{ py: 0 }}
            />
            <ListItemText primary="All characters" />
          </ListItemButton>
          <Divider />
          {characters.map(character => {
            const checked = draftIds.includes(character.characterId);
            const isLastChecked = checked && draftIds.length === 1;
            return (
              <ListItemButton
                key={character.characterId}
                disabled={isLastChecked}
                onClick={() => toggle(character.characterId)}
                sx={{ height: 40, py: 0 }}
              >
                <Checkbox
                  edge="start"
                  size="small"
                  disableRipple
                  checked={checked}
                  sx={{ py: 0 }}
                />
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <CharacterAvatar character={character} size={28} />
                </ListItemAvatar>
                <ListItemText
                  sx={{ my: 0 }}
                  primary={character.characterName}
                  primaryTypographyProps={{ lineHeight: 1.3 }}
                  secondary={character.tokenExpired ? 'Logged out' : undefined}
                  secondaryTypographyProps={{
                    color: 'warning.main',
                    fontSize: '0.6rem',
                    lineHeight: 1.2,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Popover>
    </>
  );
}

function CharacterAvatar({ character, size }: { character: Character, size: number }) {
  return (
    <Avatar
      src={character.portrait ?? undefined}
      alt={character.characterName}
      sx={{
        width: size,
        height: size,
        ...(character.tokenExpired ? { filter: 'grayscale(1)', opacity: 0.6 } : {}),
      }}
    />
  );
}

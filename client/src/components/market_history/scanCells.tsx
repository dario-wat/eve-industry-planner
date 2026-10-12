import { Box } from '@mui/material';
import { formatSignedPercent } from 'common/format';
import EveIcon from 'components/util/EveIcon';

export function ItemCell(props: { typeId: number; categoryId: number | null; name: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
      <EveIcon typeId={props.typeId} categoryId={props.categoryId ?? 0} size={24} />
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {props.name}
      </Box>
    </Box>
  );
}

export function SignedPercent(props: { value: number | null }) {
  if (props.value == null) {
    return <span>—</span>;
  }
  const color = props.value > 0 ? 'success.main' : props.value < 0 ? 'error.main' : 'text.primary';
  return (
    <Box component="span" sx={{ color, fontVariantNumeric: 'tabular-nums' }}>
      {formatSignedPercent(props.value)}
    </Box>
  );
}

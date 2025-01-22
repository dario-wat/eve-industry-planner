import { IconButton, Snackbar } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

const AUTOHIDE_DURATION_MS = 3000;

export default function CopySnackbar(props: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={props.open}
      autoHideDuration={AUTOHIDE_DURATION_MS}
      message="Copied!"
      onClose={props.onClose}
      action={
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={props.onClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    />
  );
}
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';

export default function LogOutButton() {
  const onButtonClick = async () => {
    const { status } = await axios.delete('/logout');
    if (status === 200) {
      window.location.reload();
    }
  };
  return (
    <Button
      variant="contained"
      color="neutral"
      startIcon={<LogoutIcon />}
      onClick={onButtonClick}
    >
      Logout
    </Button>
  );
}
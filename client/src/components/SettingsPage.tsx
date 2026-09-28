import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import WorkspacePage from 'components/util/WorkspacePage';
import { useColorMode } from 'theme/ColorModeProvider';
import { ColorMode } from 'theme/createAppTheme';

export default function SettingsPage() {
  const { mode, setMode } = useColorMode();

  const onClearCacheClick = async () => {
    const { status } = await axios.delete('/clear_cache');
    if (status === 200) {
      window.location.reload();
    }
  };

  return (
    <WorkspacePage scroll>
      <Card sx={{ maxWidth: 420 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Theme
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            aria-label="Theme"
            onChange={(_event, next: ColorMode | null) => {
              if (next != null) {
                setMode(next);
              }
            }}
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                px: 2,
              },
            }}
          >
            <ToggleButton value="light" color="primary">Light</ToggleButton>
            <ToggleButton value="dark" color="primary">Dark</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Cache
          </Typography>
          <Button variant="outlined" onClick={onClearCacheClick}>
            Clear Cache
          </Button>
        </CardContent>
      </Card>
    </WorkspacePage>
  );
}

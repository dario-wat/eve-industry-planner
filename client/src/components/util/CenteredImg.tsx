import { Box } from '@mui/material';

export default function CenteredImg(
  props: React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  >,
) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center">
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img {...props} />
    </Box>
  );
}
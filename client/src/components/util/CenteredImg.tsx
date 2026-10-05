import Box from '@mui/material/Box';

export default function CenteredImg({
  alt = '',
  ...props
}: React.DetailedHTMLProps<
  React.ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
>) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center">
      <img {...props} alt={alt} />
    </Box>
  );
}
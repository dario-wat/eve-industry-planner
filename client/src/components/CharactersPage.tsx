import useAxios from 'axios-hooks';
import { LinkedCharacterRes } from '@internal/shared';
import { Box, Card, CardContent, CardMedia, Grid, Typography } from '@mui/material';

export default function CharactersPage() {
  const [{ data }] = useAxios<LinkedCharacterRes>('/linked_characters');

  if (data === undefined) {
    return <Box></Box>
  }

  return (
    <Grid container spacing={2}>{
      data.map(character => (
        <Grid item width={200} key={character.characterName}>
          <CharacterCard character={character} />
        </Grid>
      ))
    }
    </Grid>
  );
}

function CharacterCard(
  { character }: { character: LinkedCharacterRes[number] },
) {
  return (
    <Card key={character.characterId}>
      <CardMedia
        sx={{ pt: 2, pl: 2, pr: 2 }}
        component="img"
        image={character.portrait}
      />
      <CardContent>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Typography gutterBottom variant="subtitle2" component="div">
            {character.characterName}
          </Typography>
        </Box>
      </CardContent>
    </Card >
  );
}
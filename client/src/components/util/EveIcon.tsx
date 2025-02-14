import CenteredImg from 'components/util/CenteredImg';

const BLUEPRINT_CAT = 9;

export default function EveIcon(props: {
  typeId: number,
  categoryId: number,
  size: number,
}) {
  const imgSrc = props.categoryId === BLUEPRINT_CAT
    ? `https://images.evetech.net/types/${props.typeId}/bp`
    : `https://images.evetech.net/types/${props.typeId}/icon`;
  return (
    <CenteredImg
      src={imgSrc}
      width={props.size}
      height={props.size}
      alt="Icon" />
  );
}

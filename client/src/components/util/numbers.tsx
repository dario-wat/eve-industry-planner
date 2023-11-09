/** Formats a number. */
export function formatNumber(
  number: number,
  fractionDigits: number = 0,
): string {
  return number.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

/** Creates a bolded number either green or red. */
export function ColoredNumber(props: {
  number: number,
  color: 'red' | 'green',
  fractionDigits?: number,
}) {

  return (
    <div style={{ color: props.color, fontWeight: 'bold' }}>
      {formatNumber(props.number, props.fractionDigits ?? 0)}
    </div>
  );
}
/** Formats the price. */
export function formatNoDecimal(price: number): string {
  return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Creates a bolded price either green or red. */
export function ColoredNumber(props: {
  number: number,
  color: 'red' | 'green',
}) {
  return (
    <div style={{ color: props.color, fontWeight: 'bold' }}>
      {formatNoDecimal(props.number)}
    </div>
  );
}
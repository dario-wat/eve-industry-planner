import useAxios from "axios-hooks";

// TODO finish
export default function MarketPage() {
  const [{ data }] = useAxios('/wallet_transactions');
  return <div>{data}</div>
}
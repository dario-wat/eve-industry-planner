import useAxios from 'axios-hooks';
import { useState } from 'react';

// TODO finish
export default function MarketPage() {
  const [{ data }] = useAxios('/market_orders');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  // const filteredData = data && data.filter((d: any) =>
  //   (d.name && isIncluded(d.name)) || (d.location && isIncluded(d.location))
  // );
  return <div>{data}</div>
}
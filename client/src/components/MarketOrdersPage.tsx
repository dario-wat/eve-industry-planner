import useAxios from 'axios-hooks';
import { MarketOrdersRes } from '@internal/shared';

export default function MarketOrdersPage() {
  const [{ data }] = useAxios<MarketOrdersRes>('/wallet_transactions');

  return (
    <div>
      bs
    </div>
  );
}
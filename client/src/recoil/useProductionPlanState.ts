import { useRecoilState } from 'recoil';
import axios from 'axios';
import { ProductionPlanRes } from '@internal/shared';
import { atom } from 'recoil';

interface ProductionPlanState {
  value: ProductionPlanRes;
  loading: boolean;
}

const initialState: ProductionPlanState = {
  value: {
    blueprintRuns: [],
    materials: [],
  },
  loading: true,
};

const productionPlanAtom = atom({
  key: 'productionPlan',
  default: initialState,
});

type UseProductionPlanState = {
  productionPlan: ProductionPlanState;
  fetchProductionPlan: (group?: string) => Promise<void>;
};

export default function useProductionPlanState(): UseProductionPlanState {
  const [productionPlan, setProductionPlan] = useRecoilState(productionPlanAtom);

  const fetchProductionPlan = async (group?: string) => {
    const { data } = await axios.get<ProductionPlanRes>(
      group ? `/production_plan/${group}` : '/production_plan'
    );
    setProductionPlan({ value: data, loading: false });
  };

  return { productionPlan, fetchProductionPlan };
}

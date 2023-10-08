import { ProductionPlanRes } from '@internal/shared';
import { atom } from 'recoil';

export interface ProductionPlanState {
  value: ProductionPlanRes,
  loading: boolean,
};

const initialState: ProductionPlanState = {
  value: {
    blueprintRuns: [],
    materials: [],
  },
  loading: true,
};

export const productionPlanAtom = atom({
  key: 'productionPlan',
  default: initialState,
});
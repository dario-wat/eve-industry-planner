import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from 'redux/store';
import axios from 'axios';
import { ProductionPlanRes } from '@internal/shared';

interface ProductionPlanState {
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

export const productionPlanSlice = createSlice({
  name: 'production_plan',
  initialState,
  reducers: {
    setProductionPlan: (state, action: PayloadAction<ProductionPlanRes>) => {
      state.value = action.payload;
      state.loading = false;
    },
  },
});

export const fetchProductionPlan = () => async (dispatch: AppDispatch) => {
  const { data } = await axios.get<ProductionPlanRes>('/production_plan');
  dispatch(setProductionPlan(data));
};

export const { setProductionPlan } = productionPlanSlice.actions;

export const selectProductionPlan = (state: RootState) => state.productionPlan;

export default productionPlanSlice.reducer;
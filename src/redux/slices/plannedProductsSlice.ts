import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from 'redux/store'
import { PlannedProductsResponse } from 'types/types';

// TODO leave here as an example LOL
interface PlannedProductsState {
  value: PlannedProductsResponse,
};

const initialState: PlannedProductsState = {
  value: [],
};

export const plannedProductsSlice = createSlice({
  name: 'planned_products',
  initialState,
  reducers: {
    setPlannedProducts: (state, action: PayloadAction<PlannedProductsResponse>) => {
      state.value = action.payload;
    },
  },
});

export const { setPlannedProducts } = plannedProductsSlice.actions;

export const selectPlannedProducts =
  (state: RootState) => state.plannedProducts.value;

export default plannedProductsSlice.reducer;
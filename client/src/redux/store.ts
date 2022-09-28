import { configureStore } from '@reduxjs/toolkit';
import productionPlanReducer from 'redux/slices/productionPlanSlice';

const store = configureStore({
  reducer: {
    productionPlan: productionPlanReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store;
import { configureStore } from '@reduxjs/toolkit'
import plannedProductReducer from 'redux/slices/plannedProductsSlice'

const store = configureStore({
  reducer: {
    plannedProducts: plannedProductReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store;
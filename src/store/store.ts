import { configureStore } from '@reduxjs/toolkit';
import { cartReducer } from './reducers/cartReducer';
import { userReducer } from './reducers/useReducer';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
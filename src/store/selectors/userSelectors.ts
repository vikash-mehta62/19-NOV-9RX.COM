import { RootState } from "../store";

export const selectUserProfile = (state: RootState) => state.user?.profile;
export const selectIsLoggedIn = (state: RootState) => state.user?.isLoggedIn;
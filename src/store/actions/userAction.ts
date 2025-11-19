import { UserActionTypes, UserProfile } from "../types/userTypes";

export const setUserProfile = (profile: UserProfile) => ({
  type: UserActionTypes.SET_USER_PROFILE,
  payload: profile,
});

export const clearUserProfile = () => ({
  type: UserActionTypes.CLEAR_USER_PROFILE,
});

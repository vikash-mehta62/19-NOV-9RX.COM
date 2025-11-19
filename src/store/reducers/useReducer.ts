import { UserActionTypes, UserState } from "../types/userTypes";

const initialState: UserState = {
  profile: null,
  isLoggedIn: false,
};

export const userReducer = (state = initialState, action: any): UserState => {
  switch (action.type) {
    case UserActionTypes.SET_USER_PROFILE:
      return {
        ...state,
        profile: action.payload,
        isLoggedIn: true,
      };
    case UserActionTypes.CLEAR_USER_PROFILE:
      return {
        ...state,
        profile: null,
        isLoggedIn: false,
      };
    default:
      return state;
  }
};
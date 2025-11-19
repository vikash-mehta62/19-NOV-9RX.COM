export interface UserProfile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    type: string;
    [key: string]: any;
  }
  
  export interface UserState {
    profile: UserProfile | null;
    isLoggedIn: boolean;
  }
  
  export enum UserActionTypes {
    SET_USER_PROFILE = "SET_USER_PROFILE",
    CLEAR_USER_PROFILE = "CLEAR_USER_PROFILE",
  }
  
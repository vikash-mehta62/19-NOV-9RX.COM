import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useDispatch } from 'react-redux';
import { setUserProfile } from './store/actions/userAction';

export const useAuthCheck = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session) {
        const { user } = sessionData.session;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id);

        if (profileData && profileData.length > 0) {
          dispatch(setUserProfile(profileData[0]));
        }
      }
    };

    checkSession();
  }, [dispatch]);
};

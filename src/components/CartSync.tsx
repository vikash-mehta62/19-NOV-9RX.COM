import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useCart } from '@/hooks/use-cart';
import { supabase } from '@/integrations/supabase/client';
import { loadCart } from '@/store/types/cartTypes';

export const CartSync = () => {
  const dispatch = useDispatch();
  const { cartItems, cartTotal, lastActionAt } = useCart();
  const lastSynced = useRef<string | null>(null);
  const hasLoadedFromSupabase = useRef(false);

  // Load cart from Supabase on login/mount
  useEffect(() => {
    const loadCartFromSupabase = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('⛔ No logged-in user, skipping cart load');
          return;
        }

        // Only load once per session
        if (hasLoadedFromSupabase.current) {
          return;
        }

        console.log('🔄 Loading cart from Supabase...');
        
        const { data: cart, error } = await supabase
          .from('carts')
          .select('items, updated_at')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('❌ Cart load error:', error);
          return;
        }

        if (cart && cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
          // Check if Supabase cart is newer than local cart
          const localLastAction = localStorage.getItem('cartLastActionAt');
          const supabaseUpdatedAt = cart.updated_at;
          
          const shouldLoadFromSupabase = !localLastAction || 
            (supabaseUpdatedAt && new Date(supabaseUpdatedAt) > new Date(localLastAction));

          if (shouldLoadFromSupabase || cartItems.length === 0) {
            console.log('✅ Loading cart from Supabase:', cart.items.length, 'items');
            dispatch(loadCart(cart.items));
            
            // Update lastSynced to prevent immediate re-sync
            if (supabaseUpdatedAt) {
              lastSynced.current = supabaseUpdatedAt;
            }
          } else {
            console.log('⏩ Local cart is newer, keeping local cart');
          }
        } else {
          console.log('📭 No cart found in Supabase');
        }

        hasLoadedFromSupabase.current = true;
      } catch (err) {
        console.error('❌ Cart load failed:', err);
      }
    };

    loadCartFromSupabase();

    // Also listen for auth state changes (login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔑 User signed in, loading cart...');
        hasLoadedFromSupabase.current = false; // Reset to allow loading
        loadCartFromSupabase();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // Sync cart to Supabase when cart changes
  useEffect(() => {
    console.log('🟢 CartSync useEffect triggered');

    if (!lastActionAt) {
      console.log('⛔ lastActionAt is null or undefined, skipping sync');
      return;
    }

    const lastActionStr = new Date(lastActionAt).toISOString();

    if (lastSynced.current === lastActionStr) {
      console.log('⏩ Already synced this action, skipping');
      return;
    }

    const sync = async () => {
      try {
        console.log('🔄 Starting cart sync...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Supabase session error:', sessionError);
          return;
        }
        if (!session?.user) {
          console.log('⛔ No logged-in user, skipping sync');
          return;
        }

        const payload = {
          items: cartItems,
          total: cartTotal,
          status: 'active',
          updated_at: lastActionStr,
          abandoned_email_sent_at: null,
        };

        console.log('Payload prepared:', payload);

        const { data: cart, error: cartError } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (cartError) {
          console.error('❌ Cart fetch error:', cartError);
          return;
        }

        if (cart) {
          console.log('📝 Updating existing cart:', cart.id);
          const { error: updateError } = await supabase
            .from('carts')
            .update(payload)
            .eq('id', cart.id);
          if (updateError) console.error('❌ Cart update error:', updateError);
        } else {
          console.log('➕ Inserting new cart');
          const { error: insertError } = await supabase
            .from('carts')
            .insert({ user_id: session.user.id, ...payload });
          if (insertError) console.error('❌ Cart insert error:', insertError);
        }

        lastSynced.current = lastActionStr;
        console.log('✅ Cart synced successfully', lastActionStr);
      } catch (err) {
        console.error('❌ Cart sync failed:', err);
      }
    };

    sync();
  }, [lastActionAt, cartItems, cartTotal]);

  return null;
};

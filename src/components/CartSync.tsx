import { useEffect, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';
import { supabase } from '@/integrations/supabase/client';

export const CartSync = () => {
  const { cartItems, cartTotal, lastActionAt } = useCart();
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    console.log('🟢 CartSync useEffect triggered');
    console.log('cartItems:', cartItems);
    console.log('cartTotal:', cartTotal);
    console.log('lastActionAt:', lastActionAt);
    console.log('lastSynced.current:', lastSynced.current);

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

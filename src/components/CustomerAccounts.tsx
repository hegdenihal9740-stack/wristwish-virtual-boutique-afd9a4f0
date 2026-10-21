import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CustomerContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const useCustomer = () => useContext(CustomerContext);

export function CustomerAccounts({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) { setUser(session?.user ?? null); setReady(true); }
      if (session?.user) {
        const back = sessionStorage.getItem('pf-oauth-return');
        if (back) {
          sessionStorage.removeItem('pf-oauth-return');
          sessionStorage.removeItem('pf-after-login');
          if (back.startsWith('/') && !back.startsWith('//') && back !== window.location.pathname + window.location.search) {
            const qIndex = back.indexOf('?');
            const path = qIndex < 0 ? back : back.slice(0, qIndex);
            const search = qIndex < 0 ? undefined : Object.fromEntries(new URLSearchParams(back.slice(qIndex + 1)));
            void (search ? router.navigate({ to: path, search, replace: true }) : router.navigate({ to: path, replace: true }));
          }
        }
      }
      if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) return;
      void router.invalidate();
      if (event !== 'SIGNED_OUT') void queryClient.invalidateQueries();
    });
    void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setReady(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router, queryClient]);
  return <CustomerContext.Provider value={{ user, ready }}>
    {children}
  </CustomerContext.Provider>;
}

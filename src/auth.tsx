import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, check, errorText } from './lib';
import type { Profile } from './types';

type AuthState = { user: User | null; profile: Profile | null; loading: boolean; error: string };
const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  error: '',
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: !!supabase,
    error: '',
  });
  useEffect(() => {
    if (!supabase) return;
    let alive = true,
      version = 0;
    async function sync(user: User | null) {
      const request = ++version;
      if (!alive) return;
      setState((previous) => ({
        user,
        profile: previous.user?.id === user?.id ? previous.profile : null,
        loading: !!user && previous.user?.id !== user.id,
        error: '',
      }));
      if (!user) return;
      try {
        const profile = check(
          await supabase!.from('profiles').select('*').eq('id', user.id).single(),
        ) as Profile;
        if (alive && request === version) setState({ user, profile, loading: false, error: '' });
      } catch (e) {
        if (alive && request === version)
          setState({ user, profile: null, loading: false, error: errorText(e) });
      }
    }
    // Do not await Supabase calls inside the auth callback (it holds the auth lock).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

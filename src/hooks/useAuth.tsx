import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, type Profile } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, inviteCode: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        (async () => { await fetchProfile(s.user.id); })();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string, inviteCode: string) => {
    // Check if any users exist yet (bootstrap mode - first user is auto-admin)
    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const isBootstrap = !profileCount || profileCount === 0;

    if (!isBootstrap) {
      // Normal mode: require valid invite code
      if (!inviteCode.trim()) return { error: 'Invite code is required' };

      const { data: codeData } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', inviteCode)
        .maybeSingle();

      if (!codeData) return { error: 'Invalid invite code' };
      if (codeData.use_count >= codeData.max_uses) return { error: 'Invite code has been used too many times' };
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) return { error: 'Invite code has expired' };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });

      if (error) return { error: error.message };

      const { error: rpcError } = await supabase.rpc('use_invite_code', { p_code: inviteCode });
      if (rpcError) return { error: 'Failed to redeem invite code' };

      return { error: null };
    }

    // Bootstrap mode: first user, no invite code needed
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

import { supabase } from './supabase';

export type UserRole = 'brand' | 'creator';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Sign up new user
export async function signUp(email: string, password: string, name: string, role: UserRole) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
      emailRedirectTo: undefined,
    },
  });
  if (error) throw error;
  return data;
}

// Sign in existing user
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current session
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current user profile
export async function getCurrentProfile(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !data) return null;
  return { id: data.id, email: data.email, name: data.name, role: data.role };
}

// Listen to auth changes
export function onAuthChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event: string, session: any) => {
    if (session) {
      const profile = await getCurrentProfile();
      callback(profile);
    } else {
      callback(null);
    }
  });
}

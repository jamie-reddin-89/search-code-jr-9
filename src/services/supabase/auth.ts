import { supabase } from '@/lib/supabase';
import { AuthError, User } from '@supabase/supabase-js';

// Represents the shape of the user data returned by Supabase
type UserProfile = User;

// signIn function
async function signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
}

// signUp function
async function signUp(email: string, password: string): Promise<{ user: UserProfile | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
}

// signOut function
async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// getCurrentUser function
async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export const auth = {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
};

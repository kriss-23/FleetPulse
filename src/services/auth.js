import { supabaseClient } from './supabase-client.js';

const roleRedirects = {
  driver: '/driver.html',
  manager: '/admin.html',
  accountant: '/accountant.html',
  warehouse: '/driver.html',
};

function requireSupabase() {
  if (!supabaseClient) {
    throw new Error('Authentication is unavailable. Configure the Supabase environment variables.');
  }
}

export async function signIn(email, password) {
  requireSupabase();
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signUp(email, password, fullName) {
  requireSupabase();
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendPasswordReset(email) {
  requireSupabase();
  const redirectTo = `${window.location.origin}/index.html#reset-password`;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password) {
  requireSupabase();
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function deleteCurrentAccount() {
  requireSupabase();
  const { data, error } = await supabaseClient.rpc('delete_current_account');
  if (error) throw new Error(error.message);
  if (!data?.deleted) throw new Error('Your account could not be deleted.');
  await signOut();
}

export async function getCurrentUser() {
  requireSupabase();
  const { data, error } = await supabaseClient.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw new Error(error.message);
  return data.user || null;
}

export async function getUserRole(userId) {
  requireSupabase();
  if (!userId) return null;
  const { data, error } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Your account role could not be loaded: ${error.message}`);
  return data?.role || null;
}

export async function getAuthenticatedContext() {
  const user = await getCurrentUser();
  if (!user) return { user: null, role: null };
  return { user, role: await getUserRole(user.id) };
}

export async function signOut() {
  requireSupabase();
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw new Error(error.message);
}

export function getRoleRedirect(role) {
  return roleRedirects[role] || '/index.html';
}

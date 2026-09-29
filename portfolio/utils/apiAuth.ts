import { createClient } from '@supabase/supabase-js';

export async function isAdminRequest(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) return false;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'portfolio' },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return false;

  const { data: admin, error: adminError } = await supabase.rpc('is_admin');
  return !adminError && admin === true;
}
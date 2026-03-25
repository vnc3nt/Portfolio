// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Hier teilen wir dem Client mit, dass er standardmäßig das 'portfolio' Schema nutzen soll
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'portfolio',
  },
});
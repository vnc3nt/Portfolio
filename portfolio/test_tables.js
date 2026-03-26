const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://lwanriaqqzgqslcendim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3YW5yaWFxcXpncXNsY2VuZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQxMTI0MzMsImV4cCI6MjAxOTY4ODQzM30.vNMpbDXxZ5O4XbaJurKahALh02pNysorOXApNFckjpo';
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'portfolio' } });

async function main() {
  const { data, error } = await supabase.rpc('get_tables'); // Or maybe just a known table
  // Since we can't easily list tables, let's try querying `about`
  const tests = ['projects', 'about', 'profiles', 'users'];
  for (const t of tests) {
    const { data: d, error: e } = await supabase.from(t).select('*').limit(1);
    console.log(`Table ${t}:`, e ? e.message : 'OK (' + d.length + ')');
  }
}

main();

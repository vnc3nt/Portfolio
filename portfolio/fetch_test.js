const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lwanriaqqzgqslcendim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3YW5yaWFxcXpncXNsY2VuZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQxMTI0MzMsImV4cCI6MjAxOTY4ODQzM30.vNMpbDXxZ5O4XbaJurKahALh02pNysorOXApNFckjpo';
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'portfolio' }
});

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, technologies, created_at, is_private')
    .eq('title', 'About-Page-Data-Do-Not-Delete')
    .order('created_at', { ascending: false });

  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
  console.log("Data:", JSON.stringify(data, null, 2));
}

main();

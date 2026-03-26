const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://lwanriaqqzgqslcendim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3YW5yaWFxcXpncXNsY2VuZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQxMTI0MzMsImV4cCI6MjAxOTY4ODQzM30.vNMpbDXxZ5O4XbaJurKahALh02pNysorOXApNFckjpo';
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'portfolio' }
});

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, is_private');
  
  if (error) console.error("Error:", error);
  else console.log("All projects:", data);
}

main();

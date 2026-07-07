const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log("Fetching duplicate reports...");
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('station_name', 'Poykent')
    .eq('month', '2026-06');

  if (error) {
    console.error("Error fetching:", error);
    return;
  }

  console.log("Reports found:", data.length);
  for (const r of data) {
    console.log(`ID: ${r.id}, Worker: ${r.worker_name}, Confirmed: ${r.confirmed_at ? 'Yes' : 'No'}`);
    
    // We want to delete the one made by 'Shadiyev Xusniddin'
    if (r.worker_name.includes('Shadiyev')) {
        console.log(`Deleting duplicate report ID: ${r.id}`);
        const { error: delError } = await supabase
            .from('work_reports')
            .delete()
            .eq('id', r.id);
        
        if (delError) {
            console.error("Delete failed:", delError);
        } else {
            console.log("Delete success!");
        }
    }
  }
}

cleanup();

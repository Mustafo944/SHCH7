require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('work_reports')
    .delete()
    .eq('station_name', 'Poykent')
    .in('month', ['2026-07', '2026-08', '07', '08']);
  
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted July and August reports for Poykent.');
  }
}

run();

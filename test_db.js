require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('work_reports').select('id, month, station_name, worker_name, confirmed_at, confirmed_by');
  console.log(JSON.stringify(data, null, 2));
}
run();

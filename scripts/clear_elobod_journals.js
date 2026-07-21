const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const stationId = 'st_3'; // Elobod

  console.log(`Clearing all journal entries for station ${stationId} (Elobod)...`);

  const { data, error } = await supabase
    .from('station_journals')
    .delete()
    .eq('station_id', stationId);

  if (error) {
    console.error("Error clearing journals:", error);
    return;
  }
  
  // To verify how many were updated, let's fetch count
  const { count } = await supabase
    .from('station_journals')
    .select('*', { count: 'exact', head: true })
    .eq('station_id', stationId);

  console.log(`Successfully cleared entries in ${count} journal records for Elobod.`);
}

main().catch(console.error);

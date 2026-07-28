import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const stationId = 'st_9'; // Poykent
  const monthStr = '2026-07'; // July

  const { data: reports, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('station_id', stationId)
    .eq('month', monthStr);

  if (error || !reports) {
    console.error("Error fetching reports:", error);
    return;
  }

  console.log(`Found ${reports.length} reports for Poykent in July 2026.`);
  for (const report of reports) {
      console.log(`Report ID: ${report.id}, isSubmitted: ${report.is_submitted}, confirmedAt: ${report.confirmed_at}`);
      
      const { error: updateError } = await supabase
          .from('work_reports')
          .update({ 
              is_submitted: false, 
              confirmed_at: null, 
              confirmed_by: null 
          })
          .eq('id', report.id);
          
      if (updateError) {
          console.error(`Failed to unlock report ${report.id}:`, updateError);
      } else {
          console.log(`Successfully unlocked report ${report.id}`);
      }
  }
}

main().catch(console.error);

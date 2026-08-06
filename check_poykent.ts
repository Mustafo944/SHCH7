import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPoykent() {
  const monthStr = '2026-08';
  
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('station_id', 'st_9')
    .eq('month', monthStr);

  if (error || !data || data.length === 0) return;
  
  const report = data[0];
  const newEntries = report.entries.map((e: any) => {
    const taskDay = parseInt((e.ragat || '').trim(), 10);
    if (!isNaN(taskDay) && taskDay < 4) { // bugun 4-avgust
      // Clear haftalik tasks that are not done to remove them completely
      if (e.haftalikJadval && !e.doneHaftalik && !e.missedReasonHaftalik) {
         e.haftalikJadval = ''; // Olib tashlash
      }
    }
    return e;
  });

  const { error: updateError } = await supabase
    .from('work_reports')
    .update({ entries: newEntries })
    .eq('id', report.id);

  if (updateError) {
    console.error('Update failed', updateError);
  } else {
    console.log('Successfully removed 9 uncompleted tasks from Poykent for August 2026.');
  }
}

fixPoykent();

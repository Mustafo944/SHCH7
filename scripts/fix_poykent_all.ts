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

  if (error || !data || data.length === 0) {
    console.error('No data found or error:', error);
    return;
  }
  
  const report = data[0];
  let removedCount = 0;

  const newEntries = report.entries.map((e: any) => {
    const taskDay = parseInt((e.ragat || '').trim(), 10);
    if (!isNaN(taskDay) && taskDay <= 18) { // bugun 18-avgust
      // Clear haftalik tasks that are not done to remove them completely
      if (e.haftalikJadval && !e.doneHaftalik && !e.missedReasonHaftalik) {
         e.haftalikJadval = ''; // Olib tashlash
         removedCount++;
      }
      if (e.yillikJadval && !e.doneYillik && !e.missedReasonYillik) {
         e.yillikJadval = ''; // Olib tashlash
         removedCount++;
      }
      if (e.yangiIshlar && !e.doneYangi && !e.missedReasonYangi) {
         e.yangiIshlar = ''; // Olib tashlash
         removedCount++;
      }
      if (e.kmoBartaraf && !e.doneKmo && !e.missedReasonKmo) {
         e.kmoBartaraf = ''; // Olib tashlash
         removedCount++;
      }
      if (e.majburiyOzgarish && !e.doneMajburiy && !e.missedReasonMajburiy) {
         e.majburiyOzgarish = ''; // Olib tashlash
         removedCount++;
      }
    }
    return e;
  });

  if (removedCount > 0) {
    const { error: updateError } = await supabase
      .from('work_reports')
      .update({ entries: newEntries })
      .eq('id', report.id);

    if (updateError) {
      console.error('Update failed', updateError);
    } else {
      console.log(`Successfully removed ${removedCount} uncompleted tasks from Poykent for August 2026.`);
    }
  } else {
    console.log('No uncompleted tasks found to remove.');
  }
}

fixPoykent();

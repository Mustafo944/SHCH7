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
  const stationId = 'st_9'; // Poykent
  
  const today = new Date('2026-07-20T10:25:36+05:00'); 
  const todayDay = today.getDate();
  const currentMonthStr = '2026-07';
  const prevMonthStr = '2026-06';
  
  console.log(`Fixing missed tasks for station ${stationId} before day ${todayDay} of ${currentMonthStr}...`);

  const { data: reports, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('station_id', stationId)
    .in('month', [currentMonthStr, prevMonthStr]);

  if (error || !reports) {
    console.error("Error fetching reports:", error);
    return;
  }

  let updatedCount = 0;
  let totalTasksFixed = 0;

  for (const report of reports) {
    let reportChanged = false;
    const isCurrentMonth = report.month === currentMonthStr;
    const isPrevMonth = report.month === prevMonthStr;
    
    const entries = Array.isArray(report.entries) ? report.entries : [];
    
    const newEntries = entries.map(e => {
        let entryChanged = false;
        const taskDay = parseInt((e.ragat || '').trim(), 10);
        if (isNaN(taskDay)) return e;

        const checkAndUpdate = (colName, doneName, reasonName) => {
           if (!e[colName]) return;
           if (e[doneName]) return; 
           if (e[reasonName]) return; 
           
           if (isCurrentMonth && taskDay < todayDay) {
               e[doneName] = true;
               entryChanged = true;
               totalTasksFixed++;
           } else if (isPrevMonth) {
               e[doneName] = true;
               entryChanged = true;
               totalTasksFixed++;
           }
        };

        checkAndUpdate('haftalikJadval', 'doneHaftalik', 'missedReasonHaftalik');
        checkAndUpdate('yillikJadval', 'doneYillik', 'missedReasonYillik');
        checkAndUpdate('yangiIshlar', 'doneYangi', 'missedReasonYangi');
        checkAndUpdate('kmoBartaraf', 'doneKmo', 'missedReasonKmo');
        checkAndUpdate('majburiyOzgarish', 'doneMajburiy', 'missedReasonMajburiy');
        
        if (entryChanged) reportChanged = true;
        
        return e;
    });

    if (reportChanged) {
       console.log(`Updating report ID: ${report.id} (month: ${report.month})`);
       const { error: updateError } = await supabase
          .from('work_reports')
          .update({ entries: newEntries })
          .eq('id', report.id);
          
       if (updateError) {
          console.error(`Failed to update report ${report.id}`, updateError);
       } else {
          updatedCount++;
       }
    }
  }
  
  console.log(`Successfully fixed ${totalTasksFixed} tasks across ${updatedCount} reports.`);
}

main().catch(console.error);

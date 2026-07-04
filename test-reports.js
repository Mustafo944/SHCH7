require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('work_reports').select('*').limit(5);
  if (error) console.error(error);
  else {
    const report = data.find(r => r.entries && r.entries.some(e => e.haftalikJadval && e.haftalikJadval.includes('Taklif')));
    if (report) {
      const entry = report.entries.find(e => e.haftalikJadval && e.haftalikJadval.includes('Taklif'));
      console.log('Found entry:', { 
        inProgressHaftalik: entry.inProgressHaftalik, 
        doneHaftalik: entry.doneHaftalik,
        worker_name: report.worker_name
      });
    } else {
      console.log('Not found');
    }
  }
})();

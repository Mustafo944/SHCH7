import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRow() {
  const { data, error } = await supabase
    .from('station_journals')
    .select('*')
    .eq('station_id', 'st_9')
    .eq('journal_type', 'du46');

  if (error || !data || data.length === 0) return;
  
  const report = data[0];
  const newEntries = report.entries.map((e: any) => {
    if (e.journalMonth === '2026-08' && e.nomber === '2') {
       if (!e.kamchilik || e.kamchilik.trim() === '') {
          e.kamchilikBajarildi = false;
          e.kamchilikImzo = '';
          e.kamchilikBajarildiAt = '';
          console.log('Fixed empty kamchilik with Boshlandi');
       }
    }
    return e;
  });

  await supabase
    .from('station_journals')
    .update({ entries: newEntries })
    .eq('id', report.id);
}

fixRow();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDU46() {
  console.log("DU-46 jurnali yozuvlarini tozalash boshlandi...");
  
  // DU-46 jurnallarini olish
  const { data, error } = await supabase
    .from('station_journals')
    .select('*')
    .eq('journal_type', 'du46'); // Changed type to journal_type
    
  if (error) {
    console.error("Xatolik:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("Hech qanday DU-46 jurnali topilmadi.");
    return;
  }
  
  console.log(`Topildi: ${data.length} ta bekatning DU-46 jurnali. Tozalanmoqda...`);
  
  // Barcha topilgan jurnallarning entries qismini bo'sh array ga o'zgartirish
  for (const journal of data) {
    const { error: updateError } = await supabase
      .from('station_journals')
      .update({ entries: [] })
      .eq('id', journal.id);
      
    if (updateError) {
      console.error(`Jurnalni tozalashda xatolik (ID: ${journal.id}):`, updateError);
    } else {
      console.log(`Bekat (ID: ${journal.station_id}) DU-46 jurnali tozalandi.`);
    }
  }
  
  console.log("Barcha DU-46 jurnallari muvaffaqiyatli tozalandi!");
}

clearDU46();

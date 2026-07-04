require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('station_equipments').select('*').limit(1).then(({data}) => console.log(JSON.stringify(data[0].taskMappings, null, 2)));

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vekigerrtwsuhupbibsd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla2lnZXJydHdzdWh1cGJpYnNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg0NTE3NSwiZXhwIjoyMDkwNDIxMTc1fQ.DBWx7islwueQAYcrpfGk8A-CQNRVlU_s6Aq980vPJtw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase.storage.from('tdms').list('', {
    limit: 20,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  
  if (error) {
    console.error("Error listing files:", error)
    return
  }
  
  console.log("Recent files in 'tdms' bucket:")
  for (const file of data) {
    console.log(file.name, file.created_at)
  }
}

main()

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const roomId = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'

async function deleteAllDocs() {
  console.log('Fetching all documents...')

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, file_name')
    .eq('room_id', roomId)

  if (error) {
    console.error('Error fetching documents:', error)
    return
  }

  console.log(`Found ${docs?.length || 0} documents`)

  for (const doc of docs || []) {
    console.log(`Deleting ${doc.file_name} (${doc.id})...`)

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id)

    if (deleteError) {
      console.error(`Failed to delete ${doc.file_name}:`, deleteError)
    } else {
      console.log(`✓ Deleted ${doc.file_name}`)
    }
  }

  console.log('\nAll documents deleted!')
}

deleteAllDocs().catch(console.error)

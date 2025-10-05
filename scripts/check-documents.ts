import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'present' : 'missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const roomId = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'

async function checkDocuments() {
  console.log('=== CHECKING DOCUMENTS TABLE ===\n')

  // Get all documents for the room
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return
  }

  console.log(`Found ${documents?.length || 0} documents\n`)

  documents?.forEach((doc, index) => {
    console.log(`--- Document ${index + 1} ---`)
    console.log(`ID: ${doc.id}`)
    console.log(`File: ${doc.file_name}`)
    console.log(`Size: ${doc.file_size} bytes`)
    console.log(`Content length: ${doc.content?.length || 0} chars`)
    console.log(`Content preview: ${doc.content?.substring(0, 200)}...`)
    console.log(`Embedding dimensions: ${doc.embedding?.length || 0}`)
    console.log(`Metadata:`, doc.metadata)
    console.log(`Created: ${doc.created_at}`)
    console.log()
  })

  // Check if "450世帯" appears in any document
  console.log('\n=== SEARCHING FOR "450世帯" ===\n')
  documents?.forEach((doc) => {
    if (doc.content?.includes('450')) {
      console.log(`✓ Found "450" in: ${doc.file_name}`)
      console.log(`Context: ${doc.content.substring(
        Math.max(0, doc.content.indexOf('450') - 50),
        doc.content.indexOf('450') + 100
      )}`)
      console.log()
    }
  })
}

checkDocuments().catch(console.error)

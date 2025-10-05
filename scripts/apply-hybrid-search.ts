import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyHybridSearch() {
  console.log('=== Applying Hybrid Search Migration ===\n')

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', 'add_hybrid_search.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration SQL loaded from:', migrationPath)
    console.log('📊 SQL length:', sql.length, 'characters\n')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log('📝 Found', statements.length, 'SQL statements to execute\n')

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`[${i + 1}/${statements.length}] Executing:`)
      console.log(statement.substring(0, 100) + '...\n')

      const { error } = await supabase.rpc('exec_sql', { sql: statement }).single()

      if (error) {
        // Try direct execution as fallback
        const { error: directError } = await supabase.from('_sql').insert({ query: statement })

        if (directError) {
          console.error('❌ Error executing statement:', directError)
          console.error('Statement:', statement)
          throw directError
        }
      }

      console.log(`✅ Statement ${i + 1} executed successfully\n`)
    }

    console.log('=== Migration Completed Successfully ===')
    console.log('\n✨ Hybrid search is now enabled!')
    console.log('📊 Testing hybrid_search_documents function...\n')

    // Test the hybrid search function
    const testQuery = 'ゴミ出し'
    const testEmbedding = Array(1536).fill(0) // Dummy embedding for testing

    const { data, error } = await supabase.rpc('hybrid_search_documents', {
      query_embedding: testEmbedding,
      query_text: testQuery,
      match_threshold: 0.2,
      match_count: 3,
    })

    if (error) {
      console.error('⚠️  Function test failed:', error)
    } else {
      console.log('✅ Function test successful!')
      console.log('📊 Results:', data?.length || 0, 'documents found')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  }
}

applyHybridSearch()
  .then(() => {
    console.log('\n✅ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })

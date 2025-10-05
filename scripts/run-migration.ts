import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'
import * as fs from 'fs'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const connectionString = process.env.DATABASE_URL ||
  `postgresql://postgres.xgkzphtgrflewckcxdth:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`

async function runMigration() {
  console.log('=== Running Hybrid Search Migration ===\n')

  // Read migration file
  const migrationPath = resolve(process.cwd(), 'supabase', 'migrations', 'add_hybrid_search.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file:', migrationPath)
  console.log('📊 SQL length:', sql.length, 'characters\n')

  // For Supabase, we'll use the connection string approach
  console.log('⚠️  MANUAL SETUP REQUIRED:\n')
  console.log('Please follow these steps:\n')
  console.log('1. Go to: https://xgkzphtgrflewckcxdth.supabase.co')
  console.log('2. Open SQL Editor from the left sidebar')
  console.log('3. Copy and paste the following SQL:\n')
  console.log('='.repeat(80))
  console.log(sql)
  console.log('='.repeat(80))
  console.log('\n4. Click "Run" to execute the migration')
  console.log('\n5. After successful execution, come back here and run:')
  console.log('   npm run dev')
  console.log('\n✨ The migration SQL has been displayed above.')
  console.log('📋 You can also find it in: supabase/migrations/add_hybrid_search.sql')
}

runMigration()
  .then(() => {
    console.log('\n✅ Instructions displayed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

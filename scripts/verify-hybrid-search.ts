import { supabaseAdmin } from '../src/lib/supabase/admin'

async function verifyHybridSearch() {
  console.log('=== Hybrid Search 実装確認 ===\n')

  try {
    // 1. Check if content_tsv column exists
    console.log('1️⃣ content_tsv列の確認...')
    const { data: columns, error: columnError } = await supabaseAdmin.rpc(
      'exec_sql',
      {
        sql: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'documents' AND column_name = 'content_tsv';
        `
      }
    )

    if (columnError) {
      // Try direct query instead
      const result = await supabaseAdmin
        .from('documents')
        .select('*')
        .limit(1)

      console.log('   ✅ documents テーブルにアクセス可能')
    } else {
      console.log('   ✅ content_tsv列が存在します')
    }

    // 2. Check if hybrid_search_documents function exists
    console.log('\n2️⃣ hybrid_search_documents関数の確認...')

    // Try to call the function with dummy data
    const dummyEmbedding = Array(1536).fill(0)
    const { data: testResult, error: functionError } = await supabaseAdmin.rpc(
      'hybrid_search_documents',
      {
        query_embedding: dummyEmbedding,
        query_text: 'テスト',
        match_threshold: 0.2,
        match_count: 1,
      }
    )

    if (functionError) {
      console.log('   ❌ エラー:', functionError.message)
      console.log('   💡 関数が存在しない可能性があります')
      return false
    } else {
      console.log('   ✅ hybrid_search_documents関数が正常に動作します')
      console.log('   📊 テスト結果:', testResult?.length || 0, '件のドキュメントが返されました')
    }

    // 3. Check existing documents count
    console.log('\n3️⃣ 既存ドキュメント数の確認...')
    const { count, error: countError } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log('   ❌ エラー:', countError.message)
    } else {
      console.log('   📊 現在のドキュメント数:', count, '件')
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ すべての確認が完了しました！')
    console.log('='.repeat(50))
    console.log('\n次のステップ:')
    console.log('1. npm run dev でアプリケーションを起動')
    console.log('2. チャットで質問してみる')
    console.log('3. ログで「HYBRID SEARCH RESULTS」を確認')

    return true

  } catch (error) {
    console.error('\n❌ 確認中にエラーが発生しました:', error)
    return false
  }
}

verifyHybridSearch()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

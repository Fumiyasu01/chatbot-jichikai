import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          コミュニティチャットボット
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          地域コミュニティ向けの汎用AIチャットボットシステム
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/super-admin"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            スーパー管理者
          </Link>
        </div>
      </div>
    </div>
  )
}

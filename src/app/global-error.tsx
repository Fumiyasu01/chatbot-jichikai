'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              予期しないエラーが発生しました
            </h2>
            <p className="text-gray-600 mb-6">
              申し訳ございません。システムエラーが発生しました。
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

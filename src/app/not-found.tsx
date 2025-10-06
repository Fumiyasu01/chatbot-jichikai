export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          404 - ページが見つかりません
        </h2>
        <p className="text-gray-600 mb-6">
          お探しのページは存在しません。
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  )
}

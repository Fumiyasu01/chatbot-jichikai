'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Room {
  id: string
  name: string
  admin_key: string
  openai_api_key_display: string
  meta_prompt: string | null
  created_at: string
  updated_at: string
}

interface FileMetadata {
  id: string
  file_name: string
  file_size: number
  created_at: string
}

interface UsageSummary {
  total_events: number
  total_tokens: number
  total_cost: number
  chat_count: number
  upload_count: number
  embedding_count: number
}

export default function RoomAdminPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [authenticated, setAuthenticated] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Update form
  const [roomName, setRoomName] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [metaPrompt, setMetaPrompt] = useState('')
  const [updating, setUpdating] = useState(false)

  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Usage tracking
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [usagePeriod, setUsagePeriod] = useState(30)

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication()
  }, [roomId])

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()

      if (!data.authenticated || data.roomId !== roomId) {
        // Not authenticated or wrong room, redirect to login
        router.push(`/admin/${roomId}/login`)
        return
      }

      setAuthenticated(true)
      await fetchRoomData()
      await fetchFiles()
      await fetchUsage()
    } catch (err) {
      console.error('Authentication check failed:', err)
      router.push(`/admin/${roomId}/login`)
    }
  }

  const fetchUsage = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/usage?period=${usagePeriod}`)

      if (response.ok) {
        const data = await response.json()
        setUsage(data.summary)
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    }
  }

  const fetchRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`)

      if (!response.ok) {
        throw new Error('ルームの取得に失敗しました')
      }

      const data = await response.json()
      setRoom(data.room)
      setRoomName(data.room.name)
      setMetaPrompt(data.room.meta_prompt || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/files`)

      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (err) {
      console.error('Failed to fetch files:', err)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')

    try {
      const updateData: any = {}
      if (roomName !== room?.name) {
        updateData.name = roomName
      }
      if (newApiKey) {
        updateData.openai_api_key = newApiKey
      }
      if (metaPrompt !== room?.meta_prompt) {
        updateData.meta_prompt = metaPrompt
      }

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '更新に失敗しました')
      }

      alert('更新しました')
      setNewApiKey('')
      setError('')
      await fetchRoomData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました'
      setError(errorMessage)
      console.error('Update error:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress('ファイルをアップロード中...')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      setUploadProgress('テキストを抽出中...')
      const response = await fetch(`/api/rooms/${roomId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error('Upload error response:', data)
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      const result = await response.json()
      console.log('Upload success:', result)

      setUploadProgress('完了しました')
      setSelectedFile(null)
      setError('')
      await fetchFiles()

      setTimeout(() => setUploadProgress(''), 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました'
      setError(errorMessage)
      console.error('File upload error:', err)
      setUploadProgress('')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('このファイルを削除しますか？')) return

    try {
      const response = await fetch(`/api/rooms/${roomId}/files/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      await fetchFiles()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push(`/admin/${roomId}/login`)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600">ルームが見つかりませんでした</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-gray-600 mt-2">ルーム管理画面</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>

        {/* Room Settings */}
        <Card>
          <CardHeader>
            <CardTitle>ルーム設定</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ルーム名
                </label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  OpenAI APIキー
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  現在: {room.openai_api_key_display}
                </p>
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="新しいAPIキーを入力（変更する場合のみ）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  メタプロンプト（AIのキャラクター設定）
                </label>
                <Textarea
                  value={metaPrompt}
                  onChange={(e) => setMetaPrompt(e.target.value)}
                  rows={4}
                  placeholder="AIの応答スタイルや制約を設定"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" disabled={updating}>
                {updating ? '更新中...' : '設定を更新'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>ファイルアップロード</CardTitle>
            <CardDescription>
              PDF、Word、テキスト、Markdownファイルをアップロードできます（最大10MB）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.txt,.md"
              />

              {uploadProgress && (
                <p className="text-sm text-blue-600">{uploadProgress}</p>
              )}

              <Button type="submit" disabled={!selectedFile || uploading}>
                {uploading ? 'アップロード中...' : 'アップロード'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <CardTitle>アップロード済みファイル</CardTitle>
            <CardDescription>{files.length}個のファイル</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.length === 0 ? (
                <p className="text-gray-500">ファイルがありません</p>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.file_size / 1024).toFixed(1)} KB ·{' '}
                        {new Date(file.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                    >
                      削除
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>使用量ダッシュボード</CardTitle>
            <CardDescription>過去{usagePeriod}日間の使用状況</CardDescription>
          </CardHeader>
          <CardContent>
            {usage ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">総イベント数</p>
                  <p className="text-2xl font-bold">{usage.total_events}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">チャット数</p>
                  <p className="text-2xl font-bold">{usage.chat_count}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">ファイル数</p>
                  <p className="text-2xl font-bold">{usage.upload_count}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">使用トークン</p>
                  <p className="text-2xl font-bold">{usage.total_tokens.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">推定コスト</p>
                  <p className="text-2xl font-bold">${Number(usage.total_cost).toFixed(4)}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600">Embedding処理</p>
                  <p className="text-2xl font-bold">{usage.embedding_count}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">使用量データを読み込み中...</p>
            )}
          </CardContent>
        </Card>

        {/* URLs */}
        <Card>
          <CardHeader>
            <CardTitle>リンク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                チャットURL（ユーザー向け）
              </label>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm break-all">
                {`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/chat/${roomId}`}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                管理URL（このページ）
              </label>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm break-all">
                {window.location.href}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

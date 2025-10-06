'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Room {
  id: string
  name: string
  created_at: string
}

interface NewRoom {
  id: string
  name: string
  admin_key: string
  admin_url: string
  chat_url: string
}

export default function SuperAdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Create room form
  const [roomName, setRoomName] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [metaPrompt, setMetaPrompt] = useState('')
  const [createdRoom, setCreatedRoom] = useState<NewRoom | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/rooms', {
        headers: {
          'x-admin-key': adminKey,
        },
      })

      if (response.ok) {
        setIsAuthenticated(true)
        const data = await response.json()
        setRooms(data.rooms)
      } else {
        setError('認証に失敗しました')
      }
    } catch (err) {
      setError('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setCreatedRoom(null)

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          name: roomName,
          openai_api_key: openaiApiKey,
          meta_prompt: metaPrompt || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'ルームの作成に失敗しました')
      }

      const data = await response.json()
      setCreatedRoom(data.room)
      setRooms([...rooms, data.room])

      // Reset form
      setRoomName('')
      setOpenaiApiKey('')
      setMetaPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>スーパー管理者ログイン</CardTitle>
            <CardDescription>管理者キーを入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="管理者キー"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                onClick={handleLogin}
                disabled={loading || !adminKey}
                className="w-full"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">スーパー管理者ダッシュボード</h1>
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
            ログアウト
          </Button>
        </div>

        {/* Create Room Form */}
        <Card>
          <CardHeader>
            <CardTitle>新しいルームを作成</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ルーム名 <span className="text-red-600">*</span>
                </label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="例: 伊都の杜自治会"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  OpenAI APIキー <span className="text-red-600">*</span>
                </label>
                <Input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  メタプロンプト（AIのキャラクター設定）
                </label>
                <Textarea
                  value={metaPrompt}
                  onChange={(e) => setMetaPrompt(e.target.value)}
                  placeholder="例: あなたは伊都の杜自治会の親切なサポートAIです。住民の質問に丁寧に答えてください。"
                  rows={4}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? '作成中...' : 'ルームを作成'}
              </Button>
            </form>

            {/* Created Room Info */}
            {createdRoom && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">
                  ルームを作成しました！
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>ルーム名:</strong> {createdRoom.name}
                  </div>
                  <div>
                    <strong>管理者用URL:</strong>
                    <div className="mt-1 p-2 bg-white rounded border break-all font-mono text-xs">
                      {createdRoom.admin_url}
                    </div>
                  </div>
                  <div>
                    <strong>チャット用URL:</strong>
                    <div className="mt-1 p-2 bg-white rounded border break-all font-mono text-xs">
                      {createdRoom.chat_url}
                    </div>
                  </div>
                  <p className="text-green-700 mt-3">
                    ⚠️ 管理者用URLは今しか表示されません。必ず保存してください。
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rooms List */}
        <Card>
          <CardHeader>
            <CardTitle>全ルーム一覧</CardTitle>
            <CardDescription>{rooms.length}個のルーム</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <p className="text-gray-500">ルームがありません</p>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{room.name}</h3>
                        <p className="text-sm text-gray-500">
                          作成日: {new Date(room.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/chat/${room.id}`
                        }}
                      >
                        チャット画面
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

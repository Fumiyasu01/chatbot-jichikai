'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { file_name: string; similarity: number }[]
}

export default function ChatPage() {
  const params = useParams()
  const roomId = params.roomId as string

  const [roomName, setRoomName] = useState('チャットボット')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch room name
    const fetchRoomName = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`, {
          headers: {
            'x-admin-key': 'public', // Public access, limited info
          },
        })
        if (response.ok) {
          const data = await response.json()
          setRoomName(data.room.name)
        }
      } catch (error) {
        console.error('Failed to fetch room name:', error)
      }
    }

    if (roomId) {
      fetchRoomName()
    }
  }, [roomId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError('')

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]
    setMessages(newMessages)

    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          roomId,
          stream: true, // Enable streaming
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'エラーが発生しました')
      }

      // Check if response is streaming (SSE)
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('ストリーミングの読み取りに失敗しました')
        }

        let streamedContent = ''
        let sources: { file_name: string; similarity: number }[] = []
        let assistantMessageIndex = newMessages.length

        // Add empty assistant message
        setMessages([...newMessages, { role: 'assistant', content: '' }])

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) break

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.substring(6))

                  if (jsonData.type === 'metadata') {
                    // Receive sources metadata
                    sources = jsonData.sources || []
                  } else if (jsonData.type === 'content') {
                    // Stream content
                    streamedContent += jsonData.content

                    // Update the assistant message in real-time
                    setMessages((prevMessages) => {
                      const updatedMessages = [...prevMessages]
                      updatedMessages[assistantMessageIndex] = {
                        role: 'assistant',
                        content: streamedContent,
                        sources: sources.length > 0 ? sources : undefined,
                      }
                      return updatedMessages
                    })
                  } else if (jsonData.type === 'done') {
                    // Streaming complete
                    console.log('Streaming completed')
                  } else if (jsonData.type === 'error') {
                    throw new Error(jsonData.error)
                  }
                } catch (parseError) {
                  // Ignore parse errors for incomplete chunks
                  console.debug('Parse error (expected for incomplete chunks):', parseError)
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      } else {
        // Fallback: non-streaming response (backward compatibility)
        const data = await response.json()

        // Add assistant message
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources,
          },
        ])
      }
    } catch (err) {
      console.error('Chat error:', err)

      // User-friendly error messages
      let errorMessage = '申し訳ございません。一時的に接続できませんでした。少し時間を置いてから再度お試しください。'

      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('タイムアウト')) {
          errorMessage = '処理に時間がかかっています。恐れ入りますが、少し時間を置いてから再度お試しください。'
        } else if (err.message.includes('ネットワーク') || err.message.includes('network')) {
          errorMessage = 'インターネット接続を確認してから、再度お試しください。'
        } else if (err.message.includes('APIキー') || err.message.includes('api')) {
          errorMessage = 'システムの設定に問題があります。管理者にお問い合わせください。'
        }
      }

      setError(errorMessage)

      // Remove the last user message if there was an error
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl md:text-2xl">{roomName}</CardTitle>
                <p className="text-blue-100 text-sm mt-1">AIがご質問にお答えします</p>
              </div>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-white hover:text-blue-100 transition-colors text-sm underline"
              >
                {showGuide ? '閉じる' : '使い方'}
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Usage Guide */}
            {showGuide && (
              <div className="bg-blue-50 border-b border-blue-200 p-4 md:p-6">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>📖</span>
                  <span>使い方ガイド</span>
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <p className="font-medium mb-1">💡 このチャットボットについて</p>
                    <p className="text-xs pl-4">自治会の資料をもとに、AIが24時間いつでもご質問にお答えします。</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">📝 質問例</p>
                    <ul className="text-xs pl-4 space-y-1">
                      <li>• ゴミの収集日はいつですか？</li>
                      <li>• 集会所の利用方法を教えてください</li>
                      <li>• 自治会費の支払い方法について</li>
                      <li>• 駐車場の利用ルールは？</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">📄 参考資料の見方</p>
                    <p className="text-xs pl-4">回答の下に表示される「参考資料」は、回答の根拠となった資料です。</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3">
                    <p className="text-xs">
                      <strong>⚠️ ご注意：</strong>
                      AIによる回答のため、誤りがある可能性があります。重要な事項は必ず自治会にご確認ください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto p-4 md:p-6 space-y-4 bg-white">
              {messages.length === 0 && !showGuide && (
                <div className="text-center text-gray-500 mt-12 md:mt-20 px-4">
                  <p className="text-xl md:text-2xl mb-3">👋 こんにちは！</p>
                  <p className="text-sm md:text-base mb-4">自治会に関するご質問にお答えします</p>
                  <div className="max-w-md mx-auto bg-blue-50 rounded-lg p-4 text-left text-xs md:text-sm">
                    <p className="font-medium text-blue-900 mb-2">💡 質問例:</p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• ゴミの収集日について教えてください</li>
                      <li>• 集会所を利用したいのですが</li>
                      <li>• 駐車場のルールを確認したい</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-3">
                      右上の「使い方」ボタンで詳しい説明をご覧いただけます
                    </p>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs text-gray-600 mb-2">
                          参考資料:
                        </p>
                        <div className="space-y-2">
                          {(() => {
                            // Group sources by file_name
                            const groupedSources = message.sources.reduce((acc, source) => {
                              if (!acc[source.file_name]) {
                                acc[source.file_name] = []
                              }
                              acc[source.file_name].push(source.similarity)
                              return acc
                            }, {} as Record<string, number[]>)

                            return Object.entries(groupedSources).map(([fileName, similarities], idx) => (
                              <div key={idx} className="text-xs">
                                <div className="text-gray-600 flex items-center gap-2 mb-1">
                                  <span>📄</span>
                                  <span className="font-medium">{fileName}</span>
                                  <span className="text-gray-400">
                                    ({similarities.length}箇所参照)
                                  </span>
                                </div>
                                <div className="ml-5 text-gray-500">
                                  類似度: {similarities.map(s => `${(s * 100).toFixed(0)}%`).join(', ')}
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-3 md:p-4 bg-gray-50">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <p className="flex-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="メッセージを入力..."
                  disabled={loading}
                  className="flex-1 text-base md:text-sm min-h-[44px] md:min-h-[36px]"
                  maxLength={2000}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="min-w-[80px] min-h-[44px] md:min-h-[36px] text-base md:text-sm"
                >
                  {loading ? '送信中...' : '送信'}
                </Button>
              </form>

              <p className="text-xs text-gray-500 mt-2 text-center md:text-left">
                {input.length}/2000文字
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-4 text-sm text-gray-600">
          <p>Powered by OpenAI · コミュニティチャットボット</p>
        </div>
      </div>
    </div>
  )
}

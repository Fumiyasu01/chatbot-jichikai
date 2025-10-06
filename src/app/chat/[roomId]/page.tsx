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

  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      setError(err instanceof Error ? err.message : 'エラーが発生しました')

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
            <CardTitle className="text-2xl">{roomName}</CardTitle>
            <p className="text-blue-100 text-sm">AIがご質問にお答えします</p>
          </CardHeader>

          <CardContent className="p-0">
            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-white">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                  <p className="text-lg mb-2">👋 こんにちは！</p>
                  <p>何でもお気軽にご質問ください。</p>
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
            <div className="border-t p-4 bg-gray-50">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="メッセージを入力..."
                  disabled={loading}
                  className="flex-1"
                  maxLength={2000}
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  {loading ? '送信中...' : '送信'}
                </Button>
              </form>

              <p className="text-xs text-gray-500 mt-2">
                Enter キーで送信 · {input.length}/2000文字
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

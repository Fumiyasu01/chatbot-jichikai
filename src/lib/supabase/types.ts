export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          name: string
          admin_key: string
          openai_api_key: string
          meta_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          admin_key: string
          openai_api_key: string
          meta_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          admin_key?: string
          openai_api_key?: string
          meta_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          room_id: string
          file_name: string
          content: string
          embedding: number[] | null
          file_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          file_name: string
          content: string
          embedding?: number[] | null
          file_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          file_name?: string
          content?: string
          embedding?: number[] | null
          file_id?: string | null
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          room_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          chunk_count: number
          processed_chunks: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          chunk_count?: number
          processed_chunks?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          chunk_count?: number
          processed_chunks?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          room_id: string
        }
        Returns: {
          id: string
          content: string
          file_name: string
          similarity: number
        }[]
      }
    }
  }
}

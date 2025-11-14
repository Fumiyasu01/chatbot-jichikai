/**
 * Database types - Re-exported from Supabase types
 * These types represent the raw database schema
 */
import { Database } from '../supabase/types'

// Table types
export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type File = Database['public']['Tables']['files']['Row']
export type FileInsert = Database['public']['Tables']['files']['Insert']
export type FileUpdate = Database['public']['Tables']['files']['Update']

// Processing status enum
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Match documents function return type
export type MatchedDocument = Database['public']['Functions']['match_documents']['Returns'][number]

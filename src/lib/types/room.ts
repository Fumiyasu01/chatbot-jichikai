/**
 * Room-related types
 */

// Room display data (with masked API key)
export interface RoomDisplay {
  id: string
  name: string
  admin_key: string
  openai_api_key_display: string
  meta_prompt: string | null
  created_at: string
  updated_at: string
}

// Room creation request
export interface CreateRoomRequest {
  name: string
  openai_api_key: string
  meta_prompt?: string
}

// Room update request
export interface UpdateRoomRequest {
  name?: string
  openai_api_key?: string
  meta_prompt?: string
}

// Room creation response
export interface CreateRoomResponse {
  room: {
    id: string
    name: string
    admin_key: string
    created_at: string
    admin_url: string
    chat_url: string
  }
}

// Room list response
export interface RoomListResponse {
  rooms: Array<{
    id: string
    name: string
    created_at: string
    updated_at: string
  }>
}

// Room details response
export interface RoomDetailsResponse {
  room: RoomDisplay
}

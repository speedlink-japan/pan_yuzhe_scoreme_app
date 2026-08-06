import { TODO_SESSION_STORAGE_KEY, TodoSession, normalizeTodoSession } from './todoSession'

interface TodoSessionSyncRecord {
  user_key: string
  session: TodoSession
  updated_at: string
}

export interface TodoRemoteSession {
  session: TodoSession
  updatedAt: string
}

const TODO_SESSION_UPDATED_AT_STORAGE_KEY = `${TODO_SESSION_STORAGE_KEY}.updatedAt`
const TODO_SESSION_PENDING_SYNC_STORAGE_KEY = `${TODO_SESSION_STORAGE_KEY}.pendingSync`
const TODO_SYNC_TABLE = 'todo_sessions'
let remoteSaveQueue: Promise<void> = Promise.resolve()

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const getSupabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const getTodoSyncUserKey = () => process.env.NEXT_PUBLIC_TODO_SYNC_USER_KEY || 'default-user'

export const isTodoSupabaseSyncConfigured = () =>
  Boolean(getSupabaseUrl() && getSupabaseAnonKey())

const getTodoSessionEndpoint = (userKey = getTodoSyncUserKey()) => {
  const supabaseUrl = getSupabaseUrl()
  if (!supabaseUrl) return null

  return `${supabaseUrl}/rest/v1/${TODO_SYNC_TABLE}?select=user_key,session,updated_at&user_key=eq.${encodeURIComponent(userKey)}`
}

const getTodoSessionUpsertEndpoint = () => {
  const supabaseUrl = getSupabaseUrl()
  if (!supabaseUrl) return null

  return `${supabaseUrl}/rest/v1/${TODO_SYNC_TABLE}?on_conflict=user_key`
}

const getTodoSessionHeaders = (prefer?: string) => {
  const anonKey = getSupabaseAnonKey()
  if (!anonKey) return null

  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

export const getLocalTodoSessionUpdatedAt = (): string | null => {
  if (typeof window === 'undefined') return null

  return window.localStorage.getItem(TODO_SESSION_UPDATED_AT_STORAGE_KEY)
}

export const saveLocalTodoSessionUpdatedAt = (updatedAt: string) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(TODO_SESSION_UPDATED_AT_STORAGE_KEY, updatedAt)
}

export const saveLocalTodoSession = (session: TodoSession, updatedAt: string) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(TODO_SESSION_STORAGE_KEY, JSON.stringify(session))
  saveLocalTodoSessionUpdatedAt(updatedAt)
}

export const markTodoSessionPendingSync = () => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(TODO_SESSION_PENDING_SYNC_STORAGE_KEY, 'true')
}

export const clearTodoSessionPendingSync = () => {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(TODO_SESSION_PENDING_SYNC_STORAGE_KEY)
}

export const hasTodoSessionPendingSync = () => {
  if (typeof window === 'undefined') return false

  return window.localStorage.getItem(TODO_SESSION_PENDING_SYNC_STORAGE_KEY) === 'true'
}

export const isRemoteTodoSessionNewer = (
  remoteUpdatedAt: string,
  localUpdatedAt: string | null
) => {
  if (!localUpdatedAt) return true

  const remoteTime = new Date(remoteUpdatedAt).getTime()
  const localTime = new Date(localUpdatedAt).getTime()
  if (Number.isNaN(remoteTime)) return false
  if (Number.isNaN(localTime)) return true

  return remoteTime > localTime
}

export const loadRemoteTodoSession = async (): Promise<TodoRemoteSession | null> => {
  const endpoint = getTodoSessionEndpoint()
  const headers = getTodoSessionHeaders()
  if (!endpoint || !headers) return null

  const response = await fetch(endpoint, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`TODO session fetch failed: ${response.status}`)
  }

  const records = (await response.json()) as Partial<TodoSessionSyncRecord>[]
  const record = records[0]
  if (!record?.session || !record.updated_at) return null

  return {
    session: normalizeTodoSession(record.session),
    updatedAt: record.updated_at,
  }
}

export const saveRemoteTodoSession = async (
  session: TodoSession,
  updatedAt: string
): Promise<void> => {
  const endpoint = getTodoSessionUpsertEndpoint()
  const headers = getTodoSessionHeaders('resolution=merge-duplicates')
  if (!endpoint || !headers) return

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_key: getTodoSyncUserKey(),
      session,
      updated_at: updatedAt,
    }),
  })

  if (!response.ok) {
    throw new Error(`TODO session save failed: ${response.status}`)
  }
}

export const queueRemoteTodoSessionSave = (
  session: TodoSession,
  updatedAt: string
): Promise<void> => {
  if (!isTodoSupabaseSyncConfigured()) return Promise.resolve()

  markTodoSessionPendingSync()
  remoteSaveQueue = remoteSaveQueue
    .catch(() => undefined)
    .then(() => saveRemoteTodoSession(session, updatedAt))

  return remoteSaveQueue
    .then(() => {
      clearTodoSessionPendingSync()
    })
    .catch(error => {
      markTodoSessionPendingSync()
      throw error
    })
}

export const persistTodoSession = (
  session: TodoSession,
  updatedAt: string
): Promise<void> => {
  const normalizedSession = normalizeTodoSession(session)
  saveLocalTodoSession(normalizedSession, updatedAt)
  return queueRemoteTodoSessionSave(normalizedSession, updatedAt)
}

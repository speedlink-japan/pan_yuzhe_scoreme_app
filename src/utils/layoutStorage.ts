import { PanelPosition } from '@/app/page'

const STORAGE_KEY = 'myscore_layout_state'
const FULLSCREEN_BACKUP_KEY = 'myscore_fullscreen_backup'
const STORAGE_VERSION = '1'

interface StorageState {
  version: string
  isLocked: boolean
  panelPositions: Record<string, PanelPosition>
  panelZIndices?: Record<string, number>
}

interface FullscreenBackup {
  version: string
  isLocked: boolean
  panelPositions: Record<string, PanelPosition>
  panelZIndices?: Record<string, number>
}

export const saveLayoutState = (
  isLocked: boolean,
  panelPositions: Record<string, PanelPosition>,
  panelZIndices?: Record<string, number>
) => {
  try {
    const state: StorageState = {
      version: STORAGE_VERSION,
      isLocked,
      panelPositions,
      panelZIndices,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save layout state:', error)
  }
}

export const loadLayoutState = (): StorageState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const state = JSON.parse(stored) as StorageState
    
    // バージョンチェック
    if (state.version !== STORAGE_VERSION) {
      console.warn('Layout state version mismatch, resetting')
      return null
    }
    
    return state
  } catch (error) {
    console.error('Failed to load layout state:', error)
    return null
  }
}

export const clearLayoutState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear layout state:', error)
  }
}

// フルスクリーン機能用：フルスクリーン前のレイアウト状態をバックアップ
export const saveFullscreenBackup = (
  isLocked: boolean,
  panelPositions: Record<string, PanelPosition>,
  panelZIndices?: Record<string, number>
) => {
  try {
    const backup: FullscreenBackup = {
      version: STORAGE_VERSION,
      isLocked,
      panelPositions,
      panelZIndices,
    }
    localStorage.setItem(FULLSCREEN_BACKUP_KEY, JSON.stringify(backup))
  } catch (error) {
    console.error('Failed to save fullscreen backup:', error)
  }
}

// フルスクリーン前のレイアウト状態を復元
export const loadFullscreenBackup = (): FullscreenBackup | null => {
  try {
    const stored = localStorage.getItem(FULLSCREEN_BACKUP_KEY)
    if (!stored) return null
    
    const backup = JSON.parse(stored) as FullscreenBackup
    
    // バージョンチェック
    if (backup.version !== STORAGE_VERSION) {
      console.warn('Fullscreen backup version mismatch, resetting')
      return null
    }
    
    return backup
  } catch (error) {
    console.error('Failed to load fullscreen backup:', error)
    return null
  }
}

// フルスクリーン前のバックアップを削除
export const clearFullscreenBackup = () => {
  try {
    localStorage.removeItem(FULLSCREEN_BACKUP_KEY)
  } catch (error) {
    console.error('Failed to clear fullscreen backup:', error)
  }
}

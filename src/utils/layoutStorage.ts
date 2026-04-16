import { PanelPosition } from '@/app/page'

const STORAGE_KEY = 'myscore_layout_state'
const STORAGE_VERSION = '1'

interface StorageState {
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

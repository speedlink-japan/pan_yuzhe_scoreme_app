'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import TopBar from '@/components/TopBar'
import BottomNavBar from '@/components/BottomNavBar'
import DraggablePanelWrapper from '@/components/DraggablePanelWrapper'
import TodoPanel from '@/components/TodoPanel'
import StudyPanel from '@/components/StudyPanel'
import CalendarPanel from '@/components/CalendarPanel'
import NotebookPanel from '@/components/NotebookPanel'
import CharacterPanel from '@/components/CharacterPanel'
import { saveLayoutState, loadLayoutState } from '@/utils/layoutStorage'
import {
  TODO_SESSION_STORAGE_KEY,
  TodoSession,
  getNotebookPoints,
  getStudyPoints,
  normalizeTodoSession,
} from '@/utils/todoSession'
import {
  clearTodoSessionPendingSync,
  getLocalTodoSessionUpdatedAt,
  hasTodoSessionPendingSync,
  isRemoteTodoSessionNewer,
  isTodoSupabaseSyncConfigured,
  loadRemoteTodoSession,
  markTodoSessionPendingSync,
  saveLocalTodoSession,
  saveRemoteTodoSession,
} from '@/utils/todoSupabaseSync'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

export interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

type LayoutMode = 'normal' | 'fullscreen'

const readTodoSession = (): TodoSession => {
  if (typeof window === 'undefined') return normalizeTodoSession(null)

  try {
    const raw = window.localStorage.getItem(TODO_SESSION_STORAGE_KEY)
    return normalizeTodoSession(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeTodoSession(null)
  }
}

// デスクトップ用デフォルトレイアウト (1024px以上)
// NotebookPanel（自由メモ）を中央に大型配置、周りに他のパネル配置
const defaultPositionsPC: Record<PanelType, PanelPosition> = {
  todo: { x: 20, y: 160, width: 280, height: 360 },
  calendar: { x: 20, y: 530, width: 280, height: 360 },
  study: { x: 320, y: 160, width: 680, height: 360 },
  notebook: { x: 1020, y: 160, width: 280, height: 730 },
  character: { x: 320, y: 530, width: 680, height: 360 },
}

// タブレット用デフォルトレイアウト (600-1024px)
const defaultPositionsTablet: Record<PanelType, PanelPosition> = {
  todo: { x: 10, y: 160, width: 320, height: 400 },
  calendar: { x: 340, y: 160, width: 320, height: 400 },
  study: { x: 10, y: 570, width: 320, height: 300 },
  notebook: { x: 340, y: 570, width: 320, height: 300 },
  character: { x: 10, y: 880, width: 650, height: 280 },
}

// モバイル用デフォルトレイアウト (600px以下)
const defaultPositionsMobile: Record<PanelType, PanelPosition> = {
  todo: { x: 10, y: 160, width: 300, height: 350 },
  calendar: { x: 10, y: 520, width: 300, height: 350 },
  study: { x: 10, y: 880, width: 300, height: 280 },
  notebook: { x: 10, y: 1170, width: 300, height: 300 },
  character: { x: 10, y: 1480, width: 300, height: 250 },
}

// 画面幅に応じてレイアウトを選択
const getDefaultLayout = (width: number): Record<PanelType, PanelPosition> => {
  if (width >= 1024) {
    return defaultPositionsPC
  } else if (width >= 600) {
    return defaultPositionsTablet
  } else {
    return defaultPositionsMobile
  }
}

const defaultPositions = defaultPositionsPC

const defaultZIndices: Record<PanelType, number> = {
  todo: 10,
  study: 11,
  calendar: 12,
  notebook: 13,
  character: 14,
}

// 動的レイアウト計算：表示パネル数に応じて画面いっぱいに使用
const calculateDynamicLayout = (
  visiblePanels: PanelType[],
  viewportWidth: number,
  topBarHeight: number = 50,
  mode: LayoutMode = 'normal'
): Record<PanelType, PanelPosition> => {
  const panelCount = visiblePanels.length
  // 初期化：全パネルをデフォルト値で設定
  const layout: Record<PanelType, PanelPosition> = {
    todo: defaultPositionsPC.todo,
    study: defaultPositionsPC.study,
    calendar: defaultPositionsPC.calendar,
    notebook: defaultPositionsPC.notebook,
    character: defaultPositionsPC.character,
  }

  // フルスクリーンモード：表示パネルのみで画面全体を埋める
  if (mode === 'fullscreen' && visiblePanels.length > 0) {
    const topBar = 50
    const bottomBar = 65
    const availableWidth = viewportWidth - 20
    const availableHeight = window.innerHeight - topBar - bottomBar - 20
    const gap = 10
    const panelCount = visiblePanels.length

    // グリッド計算
    let columns = 1,
      rows = 1
    if (panelCount === 2) {
      columns = 2
      rows = 1
    } else if (panelCount === 3) {
      columns = 3
      rows = 1
    } else if (panelCount === 4) {
      columns = 2
      rows = 2
    } else if (panelCount === 5) {
      columns = 3
      rows = 2
    } else {
      columns = Math.ceil(Math.sqrt(panelCount))
      rows = Math.ceil(panelCount / columns)
    }

    const cellWidth = (availableWidth - gap * (columns - 1)) / columns
    const cellHeight = (availableHeight - gap * (rows - 1)) / rows

    let panelIndex = 0
    for (const panel of visiblePanels) {
      const col = panelIndex % columns
      const row = Math.floor(panelIndex / columns)
      layout[panel] = {
        x: 10 + col * (cellWidth + gap),
        y: topBar + 10 + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
      }
      panelIndex++
    }
    return layout
  }

  // 計算用の定数
  const availableWidth = viewportWidth - 20 // 左右マージン 10px + 10px
  const availableHeight = window.innerHeight - topBarHeight - 65 // TopBar + BottomBar + マージン
  const gap = 10 // パネル間のスペース

  // パネル配置パターンを決定
  let columns = 1,
    rows = 1
  if (panelCount === 2) {
    columns = 2
    rows = 1
  } else if (panelCount === 3) {
    columns = 3
    rows = 1
  } else if (panelCount === 4) {
    columns = 2
    rows = 2
  } else if (panelCount === 5) {
    columns = 3
    rows = 2
  } else if (panelCount > 5) {
    // 5以上の場合は4列で対応
    columns = Math.ceil(Math.sqrt(panelCount))
    rows = Math.ceil(panelCount / columns)
  }

  // 各パネルのサイズを計算
  const panelWidth = (availableWidth - (columns - 1) * gap) / columns
  const panelHeight = (availableHeight - (rows - 1) * gap) / rows

  // 各パネルの位置を計算
  visiblePanels.forEach((panelId, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = 10 + col * (panelWidth + gap)
    const y = topBarHeight + row * (panelHeight + gap)

    layout[panelId] = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(panelWidth),
      height: Math.round(panelHeight),
    }
  })

  return layout
}

export default function Home() {
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(['calendar', 'notebook', 'character'])
  const [todoPoints, setTodoPoints] = useState(0)
  const [studyPoints, setStudyPoints] = useState(0)
  const [notebookPoints, setNotebookPoints] = useState(0)
  const [characterSpentPoints, setCharacterSpentPoints] = useState(0)
  const [isLocked, setIsLockedState] = useState(false)
  const [panelPositions, setPanelPositionsState] = useState<Record<PanelType, PanelPosition>>(defaultPositions)
  const [fullscreenPanelPositions, setFullscreenPanelPositions] = useState<Record<PanelType, PanelPosition>>(defaultPositions)
  const [panelZIndices, setPanelZIndicesState] = useState<Record<PanelType, number>>(defaultZIndices)
  const [isHydrated, setIsHydrated] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal')
  const [calendarSummaryRequestKey, setCalendarSummaryRequestKey] = useState(0)

  // 初期化：ストレージからレイアウト状態を復元 & ウィンドウサイズ監視
  useEffect(() => {
    // HTMLドキュメント初期化時に正しいレイアウトを使用
    const initializeLayout = () => {
      // ストレージからレイアウト状態を復元
      const saved = loadLayoutState()
      if (saved) {
        setIsLockedState(saved.isLocked)
        setPanelPositionsState(saved.panelPositions as Record<PanelType, PanelPosition>)
        if (saved.panelZIndices) {
          setPanelZIndicesState(saved.panelZIndices as Record<PanelType, number>)
        }
      } else {
        const width = typeof window !== 'undefined' ? window.innerWidth : 1024
        setPanelPositionsState(getDefaultLayout(width))
      }
    }

    initializeLayout()
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    const applySessionPoints = (session: TodoSession) => {
      setTodoPoints(session.earnedPoints)
      setStudyPoints(getStudyPoints(session.studyBooks))
      setNotebookPoints(getNotebookPoints(session.notebookMemos))
      setCharacterSpentPoints(session.characterShop.spentPoints)
    }

    const syncFromStorage = () => applySessionPoints(readTodoSession())
    const handleSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      applySessionPoints(normalizeTodoSession(customEvent.detail))
    }

    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener('todo-session-updated', handleSessionUpdate)
    window.addEventListener('todo-session-external-update', handleSessionUpdate)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener('todo-session-updated', handleSessionUpdate)
      window.removeEventListener('todo-session-external-update', handleSessionUpdate)
    }
  }, [])

  useEffect(() => {
    if (!isTodoSupabaseSyncConfigured()) return

    let isActive = true
    const syncSession = async () => {
      const localSession = readTodoSession()
      const localUpdatedAt = getLocalTodoSessionUpdatedAt()

      try {
        const remoteSession = await loadRemoteTodoSession()
        if (!isActive) return

        if (
          remoteSession &&
          !hasTodoSessionPendingSync() &&
          isRemoteTodoSessionNewer(remoteSession.updatedAt, localUpdatedAt)
        ) {
          saveLocalTodoSession(remoteSession.session, remoteSession.updatedAt)
          window.dispatchEvent(
            new CustomEvent('todo-session-external-update', {
              detail: remoteSession.session,
            })
          )
          return
        }

        const localIsNewer = Boolean(
          remoteSession &&
          localUpdatedAt &&
          isRemoteTodoSessionNewer(localUpdatedAt, remoteSession.updatedAt)
        )
        if (!remoteSession || hasTodoSessionPendingSync() || localIsNewer) {
          const updatedAt = localUpdatedAt || new Date().toISOString()
          await saveRemoteTodoSession(localSession, updatedAt)
          if (isActive) clearTodoSessionPendingSync()
        }
      } catch {
        markTodoSessionPendingSync()
      }
    }

    void syncSession()
    return () => {
      isActive = false
    }
  }, [])

  // レイアウト状態が変更されたときに保存
  useEffect(() => {
    if (isHydrated) {
      saveLayoutState(isLocked, panelPositions, panelZIndices)
    }
  }, [isLocked, panelPositions, panelZIndices, isHydrated])

  // フルスクリーン用の一時レイアウトを再計算
  useEffect(() => {
    if (isHydrated && layoutMode === 'fullscreen') {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1024
      const dynamicLayout = calculateDynamicLayout(visiblePanels, width, 50, layoutMode)
      setFullscreenPanelPositions(dynamicLayout)
    }
  }, [layoutMode, visiblePanels, isHydrated])

  const setIsLocked = (value: boolean) => {
    setIsLockedState(value)
  }

  const setPanelPositions = (value: Record<PanelType, PanelPosition> | ((prev: Record<PanelType, PanelPosition>) => Record<PanelType, PanelPosition>)) => {
    if (typeof value === 'function') {
      setPanelPositionsState(prev => {
        const newValue = value(prev)
        return newValue
      })
    } else {
      setPanelPositionsState(value)
    }
  }

  const togglePanel = (panel: PanelType) => {
    const nextVisiblePanels = visiblePanels.includes(panel)
      ? visiblePanels.filter(p => p !== panel)
      : [...visiblePanels, panel]

    if (layoutMode === 'normal') {
      if (visiblePanels.includes(panel)) {
        setVisiblePanels(nextVisiblePanels)
      } else {
        handleBringToFront(panel)
        setVisiblePanels(nextVisiblePanels)
      }
      return
    }

    setVisiblePanels(nextVisiblePanels)

    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    setFullscreenPanelPositions(calculateDynamicLayout(nextVisiblePanels, width, 50, layoutMode))
  }

  const handlePositionChange = (panelId: PanelType, newPosition: PanelPosition) => {
    if (layoutMode === 'fullscreen') return

    setPanelPositions(prev => ({
      ...prev,
      [panelId]: newPosition,
    }))
  }

  const handleBringToFront = (panelId: PanelType) => {
    setPanelZIndicesState(prev => {
      const currentIndices = { ...prev }
      const maxZ = Math.max(...Object.values(currentIndices))
      currentIndices[panelId] = maxZ + 1
      return currentIndices
    })
  }

  const openCalendarSummary = () => {
    setVisiblePanels(prev => {
      if (prev.includes('calendar')) return prev
      return [...prev, 'calendar']
    })
    handleBringToFront('calendar')
    setCalendarSummaryRequestKey(prev => prev + 1)
  }

  const handleReset = () => {
    // 現在のウィンドウサイズに基づいてデフォルトレイアウトを適用
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    
    // 画面サイズに応じたデフォルトレイアウトを取得して適用
    const resetLayout = getDefaultLayout(width)
    setPanelPositionsState(resetLayout)
    
    setPanelZIndicesState(defaultZIndices)
    setIsLockedState(false)
    setLayoutMode('normal') // リセット時は通常モードに戻す
  }

  const earnedTotalPoints = todoPoints + studyPoints + notebookPoints
  const totalPoints = earnedTotalPoints - characterSpentPoints
  const displayedPanelPositions = layoutMode === 'fullscreen' ? fullscreenPanelPositions : panelPositions

  return (
    <main className={styles.main}>
      <TopBar
        totalPoints={totalPoints}
        todoPoints={todoPoints}
        studyPoints={studyPoints}
        notebookPoints={notebookPoints}
        onTotalClick={openCalendarSummary}
      />

      <div className={styles.dashboardContainer}>
        {visiblePanels.includes('todo') && (
          <DraggablePanelWrapper
            initialState={displayedPanelPositions.todo}
            isLocked={isLocked}
            zIndex={panelZIndices.todo}
            onPositionChange={(pos) => handlePositionChange('todo', pos)}
            onBringToFront={() => handleBringToFront('todo')}
            hideLayoutControls={layoutMode === 'fullscreen'}
          >
            <TodoPanel onPointsChange={setTodoPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('study') && (
          <DraggablePanelWrapper
            initialState={displayedPanelPositions.study}
            isLocked={isLocked}
            zIndex={panelZIndices.study}
            onPositionChange={(pos) => handlePositionChange('study', pos)}
            onBringToFront={() => handleBringToFront('study')}
            hideLayoutControls={layoutMode === 'fullscreen'}
          >
            <StudyPanel onPointsChange={setStudyPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('calendar') && (
          <DraggablePanelWrapper
            initialState={displayedPanelPositions.calendar}
            isLocked={isLocked}
            zIndex={panelZIndices.calendar}
            onPositionChange={(pos) => handlePositionChange('calendar', pos)}
            onBringToFront={() => handleBringToFront('calendar')}
            hideLayoutControls={layoutMode === 'fullscreen'}
          >
            <CalendarPanel summaryRequestKey={calendarSummaryRequestKey} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('notebook') && (
          <DraggablePanelWrapper
            initialState={displayedPanelPositions.notebook}
            isLocked={isLocked}
            zIndex={panelZIndices.notebook}
            onPositionChange={(pos) => handlePositionChange('notebook', pos)}
            onBringToFront={() => handleBringToFront('notebook')}
            hideLayoutControls={layoutMode === 'fullscreen'}
          >
            <NotebookPanel onPointsChange={setNotebookPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('character') && (
          <DraggablePanelWrapper
            initialState={displayedPanelPositions.character}
            isLocked={isLocked}
            zIndex={panelZIndices.character}
            onPositionChange={(pos) => handlePositionChange('character', pos)}
            onBringToFront={() => handleBringToFront('character')}
            hideLayoutControls={layoutMode === 'fullscreen'}
          >
            <CharacterPanel
              availablePoints={totalPoints}
            />
          </DraggablePanelWrapper>
        )}
      </div>

      <BottomNavBar 
        visiblePanels={visiblePanels} 
        onTogglePanel={togglePanel}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
        onReset={handleReset}
        layoutMode={layoutMode}
        onToggleFullscreen={() => setLayoutMode(layoutMode === 'normal' ? 'fullscreen' : 'normal')}
      />
    </main>
  )
}

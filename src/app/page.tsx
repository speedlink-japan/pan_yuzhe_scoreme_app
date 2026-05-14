'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'
import TopBar from '@/components/TopBar'
import BottomNavBar from '@/components/BottomNavBar'
import DraggablePanelWrapper from '@/components/DraggablePanelWrapper'
import TodoPanel from '@/components/TodoPanel'
import StudyPanel from '@/components/StudyPanel'
import CalendarPanel from '@/components/CalendarPanel'
import NotebookPanel from '@/components/NotebookPanel'
import CharacterPanel from '@/components/CharacterPanel'
import { 
  saveLayoutState, 
  loadLayoutState,
  saveFullscreenBackup,
  loadFullscreenBackup,
  clearFullscreenBackup
} from '@/utils/layoutStorage'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

export interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

type LayoutMode = 'normal' | 'fullscreen'

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
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(['todo', 'study', 'calendar', 'notebook', 'character'])
  const [todoPoints, setTodoPoints] = useState(0)
  const [studyPoints, setStudyPoints] = useState(0)
  const [notebookPoints, setNotebookPoints] = useState(0)
  const [isLocked, setIsLockedState] = useState(false)
  const [panelPositions, setPanelPositionsState] = useState<Record<PanelType, PanelPosition>>(defaultPositions)
  const [panelZIndices, setPanelZIndicesState] = useState<Record<PanelType, number>>(defaultZIndices)
  const [isHydrated, setIsHydrated] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal')
  const prevLayoutModeRef = useRef<LayoutMode>('normal')

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
        // 保存されたレイアウトがない場合は、デフォルトレイアウトを使用
        const width = typeof window !== 'undefined' ? window.innerWidth : 1024
        const defaultLayout = getDefaultLayout(width)
        setPanelPositionsState(defaultLayout)
      }
    }

    initializeLayout()
    setIsHydrated(true)
  }, [])

  // レイアウト状態が変更されたときに保存
  useEffect(() => {
    if (isHydrated) {
      saveLayoutState(isLocked, panelPositions, panelZIndices)
    }
  }, [isLocked, panelPositions, panelZIndices, isHydrated])

  // layoutMode が変更されたときに動的レイアウトを再計算
  useEffect(() => {
    if (isHydrated) {
      const isEnteringFullscreen = prevLayoutModeRef.current === 'normal' && layoutMode === 'fullscreen'
      
      // フルスクリーンに入る時：フルスクリーン用のグリッドレイアウトを計算
      if (isEnteringFullscreen) {
        const width = typeof window !== 'undefined' ? window.innerWidth : 1024
        const dynamicLayout = calculateDynamicLayout(visiblePanels, width, 50, 'fullscreen')
        setPanelPositionsState(dynamicLayout)
      }
      // フルスクリーンから戻る時：バックアップから復元されているのでスキップ
      // それ以外：自動計算しない（ユーザーが調整したレイアウトを保持）
      
      // 参照を更新
      prevLayoutModeRef.current = layoutMode
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
    setVisiblePanels(prev => {
      const newVisiblePanels = prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
      
      const width = typeof window !== 'undefined' ? window.innerWidth : 1024
      
      if (width >= 1024) {
        // 新規パネル追加の場合のみ、デフォルト位置に配置
        const isNew = !prev.includes(panel)
        if (isNew) {
          // 新規パネルをデフォルト位置に追加
          const defaultLayout = getDefaultLayout(width)
          setPanelPositions(prevPos => ({
            ...prevPos,
            [panel]: defaultLayout[panel],
          }))
        }
        // パネル削除の場合は状態変更のみ（既存パネルのレイアウト保持）
      }

      return newVisiblePanels
    })
  }

  const handlePositionChange = (panelId: PanelType, newPosition: PanelPosition) => {
    // ユーザーが手動でドラッグして位置を変更した場合
    
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

  const handleToggleFullscreen = () => {
    if (layoutMode === 'normal') {
      // フルスクリーンに入る：現在のレイアウト状態をバックアップ
      saveFullscreenBackup(isLocked, panelPositions, panelZIndices)
      setLayoutMode('fullscreen')
    } else {
      // フルスクリーンから出る：バックアップからレイアウト状態を復元
      const backup = loadFullscreenBackup()
      if (backup) {
        // 先にレイアウト状態を復元
        setPanelPositionsState(backup.panelPositions as Record<PanelType, PanelPosition>)
        setPanelZIndicesState(backup.panelZIndices || defaultZIndices)
        setIsLockedState(backup.isLocked)
        clearFullscreenBackup()
      }
      // その後layoutModeを変更（useEffectがトリガーされるが計算はスキップ）
      setLayoutMode('normal')
    }
  }

  const handleReset = () => {
    // 現在のウィンドウサイズに基づいてデフォルトレイアウトを適用
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    const height = typeof window !== 'undefined' ? window.innerHeight : 768
    const topBarHeight = 50
    const bottomBarHeight = 65

    const resetLayout = getDefaultLayout(width)

    // パネルグループの外接矩形を計算
    let minX = Infinity,
      maxX = -Infinity
    let minY = Infinity,
      maxY = -Infinity

    Object.values(resetLayout).forEach((pos) => {
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x + pos.width)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y + pos.height)
    })

    const panelGroupWidth = maxX - minX
    const panelGroupHeight = maxY - minY

    const availableWidth = width - 20
    const availableHeight = height - topBarHeight - bottomBarHeight - 20

    // 中央寄せのオフセットを計算
    const centerOffsetX = (availableWidth - panelGroupWidth) / 2
    const centerOffsetY = topBarHeight + (availableHeight - panelGroupHeight) / 2

    // すべてのパネルの位置を調整
    const centeredLayout = Object.entries(resetLayout).reduce(
      (acc, [key, pos]) => {
        acc[key as PanelType] = {
          ...pos,
          x: pos.x - minX + Math.max(10, centerOffsetX),
          y: pos.y - minY + Math.max(topBarHeight + 10, centerOffsetY),
        }
        return acc
      },
      {} as Record<PanelType, PanelPosition>
    )

    setPanelPositionsState(centeredLayout)
    setPanelZIndicesState(defaultZIndices)
    setIsLockedState(false)
    setLayoutMode('normal') // リセット時は通常モードに戻す
  }

  const totalPoints = todoPoints + studyPoints + notebookPoints

  return (
    <main className={styles.main}>
      <TopBar
        totalPoints={totalPoints}
        todoPoints={todoPoints}
        studyPoints={studyPoints}
        notebookPoints={notebookPoints}
      />

      <div className={styles.dashboardContainer}>
        {visiblePanels.includes('todo') && (
          <DraggablePanelWrapper
            initialState={panelPositions.todo}
            isLocked={isLocked}
            zIndex={panelZIndices.todo}
            onPositionChange={(pos) => handlePositionChange('todo', pos)}
            onBringToFront={() => handleBringToFront('todo')}
            layoutMode={layoutMode}
          >
            <TodoPanel onPointsChange={setTodoPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('study') && (
          <DraggablePanelWrapper
            initialState={panelPositions.study}
            isLocked={isLocked}
            zIndex={panelZIndices.study}
            onPositionChange={(pos) => handlePositionChange('study', pos)}
            onBringToFront={() => handleBringToFront('study')}
            layoutMode={layoutMode}
          >
            <StudyPanel onPointsChange={setStudyPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('calendar') && (
          <DraggablePanelWrapper
            initialState={panelPositions.calendar}
            isLocked={isLocked}
            zIndex={panelZIndices.calendar}
            onPositionChange={(pos) => handlePositionChange('calendar', pos)}
            onBringToFront={() => handleBringToFront('calendar')}
            layoutMode={layoutMode}
          >
            <CalendarPanel />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('notebook') && (
          <DraggablePanelWrapper
            initialState={panelPositions.notebook}
            isLocked={isLocked}
            zIndex={panelZIndices.notebook}
            onPositionChange={(pos) => handlePositionChange('notebook', pos)}
            onBringToFront={() => handleBringToFront('notebook')}
            layoutMode={layoutMode}
          >
            <NotebookPanel onPointsChange={setNotebookPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('character') && (
          <DraggablePanelWrapper
            initialState={panelPositions.character}
            isLocked={isLocked}
            zIndex={panelZIndices.character}
            onPositionChange={(pos) => handlePositionChange('character', pos)}
            onBringToFront={() => handleBringToFront('character')}
            layoutMode={layoutMode}
          >
            <CharacterPanel />
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
        onToggleFullscreen={handleToggleFullscreen}
      />
    </main>
  )
}

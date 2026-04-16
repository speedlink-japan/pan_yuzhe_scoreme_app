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

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

export interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

// デスクトップ用デフォルトレイアウト (1024px以上)
const defaultPositionsPC: Record<PanelType, PanelPosition> = {
  todo: { x: 20, y: 160, width: 380, height: 480 },
  calendar: { x: 420, y: 160, width: 380, height: 480 },
  study: { x: 820, y: 160, width: 360, height: 320 },
  notebook: { x: 420, y: 660, width: 380, height: 320 },
  character: { x: 820, y: 490, width: 360, height: 290 },
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

export default function Home() {
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(['calendar', 'notebook', 'character'])
  const [todoPoints, setTodoPoints] = useState(0)
  const [studyPoints, setStudyPoints] = useState(0)
  const [notebookPoints, setNotebookPoints] = useState(0)
  const [isLocked, setIsLockedState] = useState(false)
  const [panelPositions, setPanelPositionsState] = useState<Record<PanelType, PanelPosition>>(defaultPositions)
  const [panelZIndices, setPanelZIndicesState] = useState<Record<PanelType, number>>(defaultZIndices)
  const [isHydrated, setIsHydrated] = useState(false)

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
        // 保存されたレイアウトがない場合は、画面幅に応じたデフォルトレイアウトを使用
        const width = typeof window !== 'undefined' ? window.innerWidth : 1024
        setPanelPositionsState(getDefaultLayout(width))
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
    setVisiblePanels(prev =>
      prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    )
  }

  const handlePositionChange = (panelId: PanelType, newPosition: PanelPosition) => {
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

  const handleReset = () => {
    // 現在のウィンドウサイズに基づいてデフォルトレイアウトを取得
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    setPanelPositionsState(getDefaultLayout(width))
    setPanelZIndicesState(defaultZIndices)
    setIsLockedState(false)
  }

  const totalPoints = todoPoints + studyPoints + notebookPoints

  return (
    <main className={styles.main}>
      <TopBar
        totalPoints={totalPoints}
        todoPoints={todoPoints}
        studyPoints={studyPoints}
        notebookPoints={notebookPoints}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
        onReset={handleReset}
      />

      <div className={styles.dashboardContainer}>
        {visiblePanels.includes('todo') && (
          <DraggablePanelWrapper
            initialState={panelPositions.todo}
            isLocked={isLocked}
            zIndex={panelZIndices.todo}
            onPositionChange={(pos) => handlePositionChange('todo', pos)}
            onBringToFront={() => handleBringToFront('todo')}
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
          >
            <CharacterPanel />
          </DraggablePanelWrapper>
        )}
      </div>

      <BottomNavBar visiblePanels={visiblePanels} onTogglePanel={togglePanel} />
    </main>
  )
}

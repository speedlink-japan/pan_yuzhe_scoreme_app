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

const defaultPositions: Record<PanelType, PanelPosition> = {
  todo: { x: 20, y: 160, width: 350, height: 450 },
  study: { x: 390, y: 160, width: 320, height: 300 },
  calendar: { x: 730, y: 160, width: 340, height: 450 },
  notebook: { x: 390, y: 480, width: 320, height: 300 },
  character: { x: 730, y: 630, width: 340, height: 280 },
}

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

  // 初期化：ストレージからレイアウト状態を復元
  useEffect(() => {
    const saved = loadLayoutState()
    if (saved) {
      setIsLockedState(saved.isLocked)
      setPanelPositionsState(saved.panelPositions as Record<PanelType, PanelPosition>)
      if (saved.panelZIndices) {
        setPanelZIndicesState(saved.panelZIndices as Record<PanelType, number>)
      }
    }
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
    setPanelPositionsState(defaultPositions)
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

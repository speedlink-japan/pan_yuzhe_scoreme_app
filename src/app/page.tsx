'use client'

import { useState } from 'react'
import styles from './page.module.css'
import TopBar from '@/components/TopBar'
import BottomNavBar from '@/components/BottomNavBar'
import PointsSummary from '@/components/PointsSummary'
import DraggablePanelWrapper from '@/components/DraggablePanelWrapper'
import TodoPanel from '@/components/TodoPanel'
import StudyPanel from '@/components/StudyPanel'
import CalendarPanel from '@/components/CalendarPanel'
import NotebookPanel from '@/components/NotebookPanel'
import CharacterPanel from '@/components/CharacterPanel'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

interface PanelPosition {
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

export default function Home() {
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(['calendar', 'notebook', 'character'])
  const [todoPoints, setTodoPoints] = useState(0)
  const [studyPoints, setStudyPoints] = useState(0)
  const [notebookPoints, setNotebookPoints] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [panelPositions, setPanelPositions] = useState<Record<PanelType, PanelPosition>>(defaultPositions)

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

  const totalPoints = todoPoints + studyPoints + notebookPoints

  return (
    <main className={styles.main}>
      <TopBar
        totalPoints={totalPoints}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      />

      {!isLocked && (
        <PointsSummary
          todoPoints={todoPoints}
          studyPoints={studyPoints}
          notebookPoints={notebookPoints}
        />
      )}

      <div className={styles.dashboardContainer}>
        {visiblePanels.includes('todo') && (
          <DraggablePanelWrapper
            initialState={panelPositions.todo}
            isLocked={isLocked}
            onPositionChange={(pos) => handlePositionChange('todo', pos)}
          >
            <TodoPanel onPointsChange={setTodoPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('study') && (
          <DraggablePanelWrapper
            initialState={panelPositions.study}
            isLocked={isLocked}
            onPositionChange={(pos) => handlePositionChange('study', pos)}
          >
            <StudyPanel onPointsChange={setStudyPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('calendar') && (
          <DraggablePanelWrapper
            initialState={panelPositions.calendar}
            isLocked={isLocked}
            onPositionChange={(pos) => handlePositionChange('calendar', pos)}
          >
            <CalendarPanel />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('notebook') && (
          <DraggablePanelWrapper
            initialState={panelPositions.notebook}
            isLocked={isLocked}
            onPositionChange={(pos) => handlePositionChange('notebook', pos)}
          >
            <NotebookPanel onPointsChange={setNotebookPoints} />
          </DraggablePanelWrapper>
        )}

        {visiblePanels.includes('character') && (
          <DraggablePanelWrapper
            initialState={panelPositions.character}
            isLocked={isLocked}
            onPositionChange={(pos) => handlePositionChange('character', pos)}
          >
            <CharacterPanel />
          </DraggablePanelWrapper>
        )}
      </div>

      <BottomNavBar visiblePanels={visiblePanels} onTogglePanel={togglePanel} />
    </main>
  )
}

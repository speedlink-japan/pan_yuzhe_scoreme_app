'use client'

import { useState } from 'react'
import styles from './page.module.css'
import TopBar from '@/components/TopBar'
import BottomNavBar from '@/components/BottomNavBar'
import PointsSummary from '@/components/PointsSummary'
import TodoPanel from '@/components/TodoPanel'
import StudyPanel from '@/components/StudyPanel'
import CalendarPanel from '@/components/CalendarPanel'
import NotebookPanel from '@/components/NotebookPanel'
import CharacterPanel from '@/components/CharacterPanel'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

export default function Home() {
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(['calendar', 'notebook', 'character'])
  const [todoPoints, setTodoPoints] = useState(0)
  const [studyPoints, setStudyPoints] = useState(0)
  const [notebookPoints, setNotebookPoints] = useState(0)
  const [isLocked, setIsLocked] = useState(false)

  const togglePanel = (panel: PanelType) => {
    setVisiblePanels(prev =>
      prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    )
  }

  const totalPoints = todoPoints + studyPoints + notebookPoints

  return (
    <main className={styles.main}>
      <TopBar
        totalPoints={totalPoints}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      />
      
      <PointsSummary
        todoPoints={todoPoints}
        studyPoints={studyPoints}
        notebookPoints={notebookPoints}
      />
      
      <div className={styles.panelContainer}>
        {visiblePanels.includes('todo') && <TodoPanel onPointsChange={setTodoPoints} />}
        {visiblePanels.includes('study') && <StudyPanel onPointsChange={setStudyPoints} />}
        {visiblePanels.includes('calendar') && <CalendarPanel />}
        {visiblePanels.includes('notebook') && <NotebookPanel onPointsChange={setNotebookPoints} />}
        {visiblePanels.includes('character') && <CharacterPanel />}
      </div>

      <BottomNavBar visiblePanels={visiblePanels} onTogglePanel={togglePanel} />
    </main>
  )
}

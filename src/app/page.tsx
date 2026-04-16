'use client'

import { useState } from 'react'
import styles from './page.module.css'
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

  const togglePanel = (panel: PanelType) => {
    setVisiblePanels(prev =>
      prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    )
  }

  return (
    <main className={styles.main}>
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

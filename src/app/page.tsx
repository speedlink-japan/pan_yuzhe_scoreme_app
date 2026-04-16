'use client'

import { useState } from 'react'
import styles from './page.module.css'
import BottomNavBar from '@/components/BottomNavBar'
import TodoPanel from '@/components/TodoPanel'
import StudyPanel from '@/components/StudyPanel'
import CalendarPanel from '@/components/CalendarPanel'
import NotebookPanel from '@/components/NotebookPanel'
import CharacterPanel from '@/components/CharacterPanel'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

export default function Home() {
  const [visiblePanels, setVisiblePanels] = useState<PanelType[]>(['calendar', 'notebook', 'character'])

  const togglePanel = (panel: PanelType) => {
    setVisiblePanels(prev =>
      prev.includes(panel)
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.panelContainer}>
        {visiblePanels.includes('todo') && <TodoPanel />}
        {visiblePanels.includes('study') && <StudyPanel />}
        {visiblePanels.includes('calendar') && <CalendarPanel />}
        {visiblePanels.includes('notebook') && <NotebookPanel />}
        {visiblePanels.includes('character') && <CharacterPanel />}
      </div>

      <BottomNavBar visiblePanels={visiblePanels} onTogglePanel={togglePanel} />
    </main>
  )
}

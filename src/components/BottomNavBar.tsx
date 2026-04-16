'use client'

import React from 'react'
import styles from './BottomNavBar.module.css'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

interface BottomNavBarProps {
  visiblePanels: PanelType[]
  onTogglePanel: (panel: PanelType) => void
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ visiblePanels, onTogglePanel }) => {
  const panels: { id: PanelType; label: string; icon: string }[] = [
    { id: 'todo', label: 'TODO', icon: '✓' },
    { id: 'study', label: 'Study', icon: '📚' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'notebook', label: 'Notebook', icon: '📝' },
    { id: 'character', label: 'Me', icon: '🏠' },
  ]

  return (
    <nav className={styles.navbar}>
      {panels.map(panel => (
        <button
          key={panel.id}
          className={`${styles.navItem} ${styles[panel.id]} ${visiblePanels.includes(panel.id) ? styles.active : ''}`}
          onClick={() => onTogglePanel(panel.id)}
          title={panel.label}
        >
          <span className={styles.icon}>{panel.icon}</span>
          <span className={styles.label}>{panel.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNavBar

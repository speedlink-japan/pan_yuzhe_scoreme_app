'use client'

import React from 'react'
import styles from './BottomNavBar.module.css'

type PanelType = 'todo' | 'study' | 'calendar' | 'notebook' | 'character'

interface BottomNavBarProps {
  visiblePanels: PanelType[]
  onTogglePanel: (panel: PanelType) => void
  isLocked: boolean
  onToggleLock: () => void
  onReset: () => void
  layoutMode: 'normal' | 'fullscreen'
  onToggleFullscreen: () => void
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ 
  visiblePanels, 
  onTogglePanel,
  isLocked,
  onToggleLock,
  onReset,
  layoutMode,
  onToggleFullscreen,
}) => {
  const panels: { id: PanelType; label: string; icon: string }[] = [
    { id: 'todo', label: 'TODO', icon: '✓' },
    { id: 'study', label: 'Study', icon: '📚' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'notebook', label: 'Notebook', icon: '📝' },
    { id: 'character', label: 'Me', icon: '🏠' },
  ]

  const handleReset = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm('レイアウトをリセットしてもよろしいですか？')
    ) {
      onReset()
    }
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.panelButtons}>
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
      </div>

      <div className={styles.controlButtons}>
        <button
          className={`${styles.controlButton} ${styles.fullscreenButton} ${layoutMode === 'fullscreen' ? styles.active : ''}`}
          onClick={onToggleFullscreen}
          title={layoutMode === 'fullscreen' ? 'クリックして通常表示' : 'クリックしてフルスクリーン'}
        >
          🖥️
        </button>

        <button
          className={`${styles.controlButton} ${styles.lockButton} ${isLocked ? styles.locked : ''}`}
          onClick={onToggleLock}
          title={isLocked ? 'クリックして配置を調整' : 'クリックして固定'}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>

        <button
          className={`${styles.controlButton} ${styles.resetButton}`}
          onClick={handleReset}
          title="レイアウトをリセット"
        >
          🔄
        </button>
      </div>
    </nav>
  )
}

export default BottomNavBar

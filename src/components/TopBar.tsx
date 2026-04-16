'use client'

import React from 'react'
import styles from './TopBar.module.css'

interface TopBarProps {
  totalPoints: number
  todoPoints: number
  studyPoints: number
  notebookPoints: number
  isLocked: boolean
  onToggleLock: () => void
  onReset: () => void
}

const TopBar: React.FC<TopBarProps> = ({
  totalPoints,
  todoPoints,
  studyPoints,
  notebookPoints,
  isLocked,
  onToggleLock,
  onReset,
}) => {
  const handleReset = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm('レイアウトをリセットしてもよろしいですか？サイズと位置がリセットされます。')
    ) {
      onReset()
    }
  }
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <div className={styles.brandBadge}>🌷</div>
        <div className={styles.brandText}>
          <h1>MyScore</h1>
          <p>自己育成ゲーム</p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>⭐</span>
          <div>
            <span className={styles.statLabel}>合計</span>
            <span className={styles.statValue}>{totalPoints}pt</span>
          </div>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>✓</span>
          <div>
            <span className={styles.statLabel}>TODO</span>
            <span className={styles.statValueSmall}>{todoPoints}pt</span>
          </div>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>📚</span>
          <div>
            <span className={styles.statLabel}>読書</span>
            <span className={styles.statValueSmall}>{studyPoints}pt</span>
          </div>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>📝</span>
          <div>
            <span className={styles.statLabel}>メモ</span>
            <span className={styles.statValueSmall}>{notebookPoints}pt</span>
          </div>
        </div>
      </div>

      <button
        className={`${styles.lockButton} ${isLocked ? styles.locked : ''}`}
        onClick={onToggleLock}
        title={isLocked ? 'クリックして配置を調整' : 'クリックして固定'}
      >
        {isLocked ? '🔒' : '🔓'}
        <span className={styles.buttonLabel}>{isLocked ? 'ロック中' : '調整'}</span>
      </button>

      <button
        className={styles.resetButton}
        onClick={handleReset}
        title="レイアウトをリセット"
      >
        🔄
        <span className={styles.buttonLabel}>リセット</span>
      </button>
    </header>
  )
}

export default TopBar

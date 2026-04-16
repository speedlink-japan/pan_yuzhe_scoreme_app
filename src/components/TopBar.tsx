'use client'

import React from 'react'
import styles from './TopBar.module.css'

interface TopBarProps {
  totalPoints: number
  isLocked: boolean
  onToggleLock: () => void
}

const TopBar: React.FC<TopBarProps> = ({ totalPoints, isLocked, onToggleLock }) => {
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
            <span className={styles.statLabel}>合計ポイント</span>
            <span className={styles.statValue}>{totalPoints}pt</span>
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
    </header>
  )
}

export default TopBar

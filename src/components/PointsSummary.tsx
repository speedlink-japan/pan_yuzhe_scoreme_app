'use client'

import React from 'react'
import styles from './PointsSummary.module.css'

interface PointsSummaryProps {
  todoPoints: number
  studyPoints: number
  notebookPoints: number
}

const PointsSummary: React.FC<PointsSummaryProps> = ({
  todoPoints,
  studyPoints,
  notebookPoints,
}) => {
  const totalPoints = todoPoints + studyPoints + notebookPoints

  return (
    <div className={styles.summary}>
      <h3 className={styles.title}>📊 ポイントサマリー</h3>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.label}>TODOポイント</span>
          <span className={`${styles.value} ${styles.todo}`}>{todoPoints}pt</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>読書ポイント</span>
          <span className={`${styles.value} ${styles.study}`}>{studyPoints}pt</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>メモポイント</span>
          <span className={`${styles.value} ${styles.notebook}`}>{notebookPoints}pt</span>
        </div>
        <div className={`${styles.stat} ${styles.total}`}>
          <span className={styles.label}>合計ポイント</span>
          <span className={styles.value}>{totalPoints}pt</span>
        </div>
      </div>
    </div>
  )
}

export default PointsSummary

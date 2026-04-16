'use client'

import React, { useState } from 'react'
import styles from './NotebookPanel.module.css'

interface Memo {
  id: string
  title: string
  content: string
  color: string
  createdAt: Date
  points: number
}

const NotebookPanel: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([
    {
      id: '1',
      title: 'Sample Memo',
      content: 'This is a sample memo for testing.',
      color: '#FFB6C1',
      createdAt: new Date(),
      points: 50,
    },
  ])
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view')
  const [newMemo, setNewMemo] = useState<{
    title: string
    content: string
    color: string
  }>({
    title: '',
    content: '',
    color: '#FFB6C1',
  })

  const addMemo = () => {
    if (newMemo.title.trim() && newMemo.content.trim()) {
      const points = Math.floor(newMemo.content.length / 10)

      setMemos([
        ...memos,
        {
          id: Date.now().toString(),
          title: newMemo.title,
          content: newMemo.content,
          color: newMemo.color,
          createdAt: new Date(),
          points,
        },
      ])

      setNewMemo({
        title: '',
        content: '',
        color: '#FFB6C1',
      })
      setActiveTab('view')
    }
  }

  const calculateTotalPoints = () => {
    return memos.reduce((sum, memo) => sum + memo.points, 0)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>📝 Notebook</h2>
        <span className={styles.pointsBadge}>Total: {calculateTotalPoints()}pts</span>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'view' ? styles.active : ''}`}
          onClick={() => setActiveTab('view')}
        >
          View Notes
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'add' ? styles.active : ''}`}
          onClick={() => setActiveTab('add')}
        >
          + Add
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'view' ? (
          <div className={styles.notesList}>
            {memos.map(memo => (
              <div key={memo.id} className={styles.noteItem}>
                <div
                  className={styles.notePreview}
                  style={{ backgroundColor: memo.color }}
                >
                  <h4>{memo.title}</h4>
                  <p>{memo.content.substring(0, 50)}...</p>
                  <div className={styles.noteInfo}>
                    <span className={styles.noteType}>Memo</span>
                    <span className={styles.notePoints}>+{memo.points}pt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.addForm}>
            <div className={styles.formGroup}>
              <label>Title:</label>
              <input
                type="text"
                value={newMemo.title}
                onChange={(e) => setNewMemo({ ...newMemo, title: e.target.value })}
                placeholder="Enter title..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Color:</label>
              <div className={styles.colorPicker}>
                {['#FFB6C1', '#FFE4B5', '#E6E6FA', '#B0E0E6', '#90EE90'].map(color => (
                  <button
                    key={color}
                    className={`${styles.colorOption} ${newMemo.color === color ? styles.selected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewMemo({ ...newMemo, color })}
                  />
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Content:</label>
              <textarea
                value={newMemo.content}
                onChange={(e) => setNewMemo({ ...newMemo, content: e.target.value })}
                placeholder="Write your memo here..."
                rows={8}
              />
            </div>

            <button onClick={addMemo} className={styles.submitBtn}>
              Save Memo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotebookPanel

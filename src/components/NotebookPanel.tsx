'use client'

import React, { useState } from 'react'
import styles from './NotebookPanel.module.css'
import {
  NotebookMemoRecord,
  PointAccount,
  TODO_SESSION_STORAGE_KEY,
  TodoSession,
  getNotebookPoints,
  getTodoTimestamp,
  normalizeTodoSession,
} from '@/utils/todoSession'
import { calculateMemoPoints, upsertPointLedgerEntry } from '@/utils/pointLedger'
import { persistTodoSession } from '@/utils/todoSupabaseSync'

const readTodoSession = (): TodoSession => {
  if (typeof window === 'undefined') return normalizeTodoSession(null)

  try {
    const raw = window.localStorage.getItem(TODO_SESSION_STORAGE_KEY)
    return normalizeTodoSession(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeTodoSession(null)
  }
}

interface NotebookPanelProps {
  onPointsChange?: (points: number) => void
}

const NotebookPanel: React.FC<NotebookPanelProps> = ({ onPointsChange }) => {
  const [memos, setMemos] = useState<NotebookMemoRecord[]>([])
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view')
  const [newMemo, setNewMemo] = useState<{
    title: string
    content: string
    color: string
    pointAccount?: PointAccount
  }>({
    title: '',
    content: '',
    color: '#FFB6C1',
    pointAccount: undefined,
  })

  const addMemo = () => {
    if (newMemo.title.trim() && newMemo.content.trim()) {
      const points = calculateMemoPoints(
        newMemo.content.length,
        readTodoSession().pointRules
      )
      const currentSession = readTodoSession()
      const memo: NotebookMemoRecord = {
        id: crypto.randomUUID(),
        title: newMemo.title.trim(),
        content: newMemo.content,
        color: newMemo.color,
        createdAt: getTodoTimestamp(),
        points,
        pointAccount: newMemo.pointAccount ?? currentSession.pointRules.memoAccount,
      }

      const nextMemos = [
        ...memos,
        memo,
      ]

      const nextSession = normalizeTodoSession({
        ...currentSession,
        notebookMemos: nextMemos,
        pointLedger: upsertPointLedgerEntry(currentSession.pointLedger, {
          id: `ledger-memo-${memo.id}`,
          sourceType: 'memo',
          sourceId: `memo:${memo.id}`,
          title: memo.title,
          account: memo.pointAccount ?? currentSession.pointRules.memoAccount,
          points: memo.points,
          occurredAt: memo.createdAt,
          reason: 'メモ記録',
        }),
      })
      const updatedAt = getTodoTimestamp()

      try {
        void persistTodoSession(nextSession, updatedAt).catch(() => undefined)
      } catch {
        window.alert('メモの保存に失敗した。')
        return
      }

      setMemos(nextSession.notebookMemos)
      window.dispatchEvent(
        new CustomEvent('todo-session-external-update', { detail: nextSession })
      )

      setNewMemo({
        title: '',
        content: '',
        color: '#FFB6C1',
        pointAccount: undefined,
      })
      setActiveTab('view')
    }
  }

  const calculateTotalPoints = () => {
    return getNotebookPoints(memos)
  }

  // ポイント変更を親に通知
  React.useEffect(() => {
    onPointsChange?.(getNotebookPoints(memos))
  }, [memos, onPointsChange])

  React.useEffect(() => {
    setMemos(readTodoSession().notebookMemos)

    const handleSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      setMemos(normalizeTodoSession(customEvent.detail).notebookMemos)
    }

    window.addEventListener('todo-session-updated', handleSessionUpdate)
    window.addEventListener('todo-session-external-update', handleSessionUpdate)
    return () => {
      window.removeEventListener('todo-session-updated', handleSessionUpdate)
      window.removeEventListener('todo-session-external-update', handleSessionUpdate)
    }
  }, [])

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
                    <span className={styles.accountBadge}>{memo.pointAccount === 'rest' ? '休憩' : '頑張り'}</span>
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
              <label>獲得口座:</label>
              <select
                value={newMemo.pointAccount ?? ''}
                onChange={(e) => setNewMemo({ ...newMemo, pointAccount: (e.target.value || undefined) as PointAccount | undefined })}
              >
                <option value="">ルールに従う</option>
                <option value="effort">頑張り</option>
                <option value="rest">休憩</option>
              </select>
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

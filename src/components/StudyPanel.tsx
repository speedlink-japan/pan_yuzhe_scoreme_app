'use client'

import React, { useState } from 'react'
import styles from './StudyPanel.module.css'
import {
  StudyBookRecord,
  StudyCategory,
  PointAccount,
  TODO_SESSION_STORAGE_KEY,
  TodoSession,
  getStudyPoints,
  getTodoTimestamp,
  normalizeTodoSession,
} from '@/utils/todoSession'
import { calculateReadingPoints, upsertPointLedgerEntry } from '@/utils/pointLedger'
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

interface StudyPanelProps {
  onPointsChange?: (points: number) => void
}

const StudyPanel: React.FC<StudyPanelProps> = ({ onPointsChange }) => {
  const [books, setBooks] = useState<StudyBookRecord[]>(() => readTodoSession().studyBooks)
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view')
  const [newBook, setNewBook] = useState<{
    title: string
    category: StudyCategory
    pageCount: number
    pointAccount?: PointAccount
  }>({
    title: '',
    category: 'bunko',
    pageCount: 1,
    pointAccount: undefined,
  })

  const calculatePoints = (pageCount: number, category = newBook.category) =>
    calculateReadingPoints(category, pageCount, readTodoSession().pointRules)

  const commitBooks = (nextBooks: StudyBookRecord[], savedBook?: StudyBookRecord): boolean => {
    const currentSession = readTodoSession()
    const nextSession = normalizeTodoSession({
      ...currentSession,
      studyBooks: nextBooks,
      pointLedger: savedBook
        ? upsertPointLedgerEntry(currentSession.pointLedger, {
            id: `ledger-reading-${savedBook.id}`,
            sourceType: 'reading',
            sourceId: `reading:${savedBook.id}`,
            title: savedBook.title,
            account: savedBook.pointAccount ?? currentSession.pointRules.readingAccount,
            points: savedBook.points,
            occurredAt: savedBook.createdAt,
            reason: '読書記録',
          })
        : currentSession.pointLedger,
    })
    const updatedAt = getTodoTimestamp()

    try {
      void persistTodoSession(nextSession, updatedAt).catch(() => undefined)
    } catch {
      window.alert('読書記録の保存に失敗した。')
      return false
    }

    setBooks(nextSession.studyBooks)
    window.dispatchEvent(
      new CustomEvent('todo-session-external-update', { detail: nextSession })
    )
    return true
  }

  const addBook = () => {
    if (newBook.title.trim() && newBook.pageCount > 0) {
      const points = calculatePoints(newBook.pageCount, newBook.category)
      const createdAt = getTodoTimestamp()
      const book: StudyBookRecord = {
        id: crypto.randomUUID(),
        title: newBook.title.trim(),
        category: newBook.category,
        pageCount: newBook.pageCount,
        createdAt,
        points,
        pointAccount: newBook.pointAccount ?? readTodoSession().pointRules.readingAccount,
      }

      const nextBooks = [
        ...books,
        book,
      ]

      if (!commitBooks(nextBooks, book)) return

      setNewBook({
        title: '',
        category: 'bunko',
        pageCount: 1,
        pointAccount: undefined,
      })
      setActiveTab('view')
    }
  }

  const calculateTotalPoints = () => {
    return getStudyPoints(books)
  }

  // ポイント変更を親に通知
  React.useEffect(() => {
    onPointsChange?.(getStudyPoints(books))
  }, [books, onPointsChange])

  React.useEffect(() => {
    const handleSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      setBooks(normalizeTodoSession(customEvent.detail).studyBooks)
    }

    window.addEventListener('todo-session-updated', handleSessionUpdate)
    window.addEventListener('todo-session-external-update', handleSessionUpdate)
    return () => {
      window.removeEventListener('todo-session-updated', handleSessionUpdate)
      window.removeEventListener('todo-session-external-update', handleSessionUpdate)
    }
  }, [])

  const categoryLabels: Record<string, string> = {
    manga: '漫画',
    bunko: '文庫本',
    magazine: '雑誌',
    textbook: '教科書',
    paper: '文献',
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>📚 Study</h2>
        <span className={styles.pointsBadge}>Total: {calculateTotalPoints()}pts</span>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'view' ? styles.active : ''}`}
          onClick={() => setActiveTab('view')}
        >
          Books
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
          <div className={styles.booksList}>
            {books.map(book => (
              <div key={book.id} className={styles.bookItem}>
                <div className={styles.bookPreview}>
                  <h4>{book.title}</h4>
                  <div className={styles.bookInfo}>
                    <span className={styles.bookCategory}>{categoryLabels[book.category]}</span>
                    <span className={styles.bookPages}>{book.pageCount}p</span>
                    <span className={styles.bookPoints}>+{book.points}pt</span>
                    <span className={styles.accountBadge}>{book.pointAccount === 'rest' ? '休憩' : '頑張り'}</span>
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
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                placeholder="Book title..."
              />
            </div>

            <div className={styles.formGroup}>
              <label>Category:</label>
              <select
                value={newBook.category}
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value as StudyCategory })}
              >
                <option value="manga">漫画</option>
                <option value="bunko">文庫本</option>
                <option value="magazine">雑誌</option>
                <option value="textbook">教科書</option>
                <option value="paper">文献</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>獲得口座:</label>
              <select
                value={newBook.pointAccount ?? ''}
                onChange={(e) => setNewBook({ ...newBook, pointAccount: (e.target.value || undefined) as PointAccount | undefined })}
              >
                <option value="">ルールに従う</option>
                <option value="effort">頑張り</option>
                <option value="rest">休憩</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Pages Read:</label>
              <input
                type="number"
                value={newBook.pageCount}
                onChange={(e) => setNewBook({ ...newBook, pageCount: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>

            <div className={styles.pointsPreview}>
              Points: +{calculatePoints(newBook.pageCount)}pt
            </div>

            <button onClick={addBook} className={styles.submitBtn}>
              Save Book
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudyPanel

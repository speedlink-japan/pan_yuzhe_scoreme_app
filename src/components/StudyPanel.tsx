'use client'

import React, { useState } from 'react'
import styles from './StudyPanel.module.css'

interface Book {
  id: string
  title: string
  category: 'manga' | 'bunko' | 'magazine' | 'textbook' | 'paper'
  pageCount: number
  createdAt: Date
  points: number
}

const StudyPanel: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([
    {
      id: '1',
      title: 'Sample Book',
      category: 'bunko',
      pageCount: 50,
      createdAt: new Date(),
      points: 150,
    },
  ])
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view')
  const [newBook, setNewBook] = useState<{
    title: string
    category: 'manga' | 'bunko' | 'magazine' | 'textbook' | 'paper'
    pageCount: number
  }>({
    title: '',
    category: 'bunko',
    pageCount: 1,
  })

  const calculatePoints = (category: string, pageCount: number) => {
    const categories: Record<string, number> = {
      manga: 3,
      bunko: 3,
      magazine: 3,
      textbook: 3,
      paper: 3,
    }
    const pointPerPage = categories[category] || 3
    return pageCount * pointPerPage
  }

  const addBook = () => {
    if (newBook.title.trim() && newBook.pageCount > 0) {
      const points = calculatePoints(newBook.category, newBook.pageCount)

      setBooks([
        ...books,
        {
          id: Date.now().toString(),
          title: newBook.title,
          category: newBook.category,
          pageCount: newBook.pageCount,
          createdAt: new Date(),
          points,
        },
      ])

      setNewBook({
        title: '',
        category: 'bunko',
        pageCount: 1,
      })
      setActiveTab('view')
    }
  }

  const calculateTotalPoints = () => {
    return books.reduce((sum, book) => sum + book.points, 0)
  }

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
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value as 'manga' | 'bunko' | 'magazine' | 'textbook' | 'paper' })}
              >
                <option value="manga">漫画</option>
                <option value="bunko">文庫本</option>
                <option value="magazine">雑誌</option>
                <option value="textbook">教科書</option>
                <option value="paper">文献</option>
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
              Points: +{calculatePoints(newBook.category, newBook.pageCount)}pt
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

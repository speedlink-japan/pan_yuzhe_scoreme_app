'use client'

import React, { useState } from 'react'
import styles from './NotebookPanel.module.css'

interface Note {
  id: string
  type: 'memo' | 'book'
  title: string
  content: string
  color: string
  pageCount?: number
  createdAt: Date
  points: number
}

const NotebookPanel: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      type: 'memo',
      title: 'Sample Memo',
      content: 'This is a sample memo for testing.',
      color: '#FFB6C1',
      createdAt: new Date(),
      points: 50,
    },
  ])
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view')
  const [newNote, setNewNote] = useState<{
    type: 'memo' | 'book'
    title: string
    content: string
    color: string
    pageCount?: number
  }>({
    type: 'memo',
    title: '',
    content: '',
    color: '#FFB6C1',
    pageCount: 1,
  })

  const addNote = () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      const points = newNote.type === 'memo'
        ? Math.floor(newNote.content.length / 10)
        : newNote.pageCount! * 50

      setNotes([
        ...notes,
        {
          id: Date.now().toString(),
          type: newNote.type,
          title: newNote.title,
          content: newNote.content,
          color: newNote.color,
          pageCount: newNote.pageCount,
          createdAt: new Date(),
          points,
        },
      ])

      setNewNote({
        type: 'memo',
        title: '',
        content: '',
        color: '#FFB6C1',
        pageCount: 1,
      })
      setActiveTab('view')
    }
  }

  const calculateTotalPoints = () => {
    return notes.reduce((sum, note) => sum + note.points, 0)
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
            {notes.map(note => (
              <div key={note.id} className={styles.noteItem}>
                <div
                  className={styles.notePreview}
                  style={{ backgroundColor: note.color }}
                >
                  <h4>{note.title}</h4>
                  <p>{note.content.substring(0, 50)}...</p>
                  <div className={styles.noteInfo}>
                    <span className={styles.noteType}>{note.type === 'memo' ? 'Memo' : 'Book'}</span>
                    <span className={styles.notePoints}>+{note.points}pt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.addForm}>
            <div className={styles.formGroup}>
              <label>Type:</label>
              <select
                value={newNote.type}
                onChange={(e) => setNewNote({ ...newNote, type: e.target.value as 'memo' | 'book' })}
              >
                <option value="memo">Memo</option>
                <option value="book">Book</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Title:</label>
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Enter title..."
              />
            </div>

            {newNote.type === 'memo' && (
              <div className={styles.formGroup}>
                <label>Color:</label>
                <div className={styles.colorPicker}>
                  {['#FFB6C1', '#FFE4B5', '#E6E6FA', '#B0E0E6', '#90EE90'].map(color => (
                    <button
                      key={color}
                      className={`${styles.colorOption} ${newNote.color === color ? styles.selected : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewNote({ ...newNote, color })}
                    />
                  ))}
                </div>
              </div>
            )}

            {newNote.type === 'book' && (
              <div className={styles.formGroup}>
                <label>Pages Read:</label>
                <input
                  type="number"
                  value={newNote.pageCount}
                  onChange={(e) => setNewNote({ ...newNote, pageCount: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Content:</label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Write your note here..."
                rows={8}
              />
            </div>

            <button onClick={addNote} className={styles.submitBtn}>
              Save Note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotebookPanel

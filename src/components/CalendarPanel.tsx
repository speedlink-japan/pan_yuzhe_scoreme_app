'use client'

import React from 'react'
import styles from './CalendarPanel.module.css'
import {
  TODO_SESSION_STORAGE_KEY,
  TodoDailyStats,
  TodoPointHistoryItem,
  TodoSession,
  getTodoDailyStats,
  getTodoPointHistoryForDate,
  normalizeTodoSession,
} from '@/utils/todoSession'

const readTodoSession = (): TodoSession => {
  if (typeof window === 'undefined') return normalizeTodoSession(null)

  try {
    const rawSession = window.localStorage.getItem(TODO_SESSION_STORAGE_KEY)
    return rawSession ? normalizeTodoSession(JSON.parse(rawSession)) : normalizeTodoSession(null)
  } catch {
    return normalizeTodoSession(null)
  }
}

const getCalendarDateKey = (year: number, month: number, day: number): string => {
  const monthKey = `${month + 1}`.padStart(2, '0')
  const dayKey = `${day}`.padStart(2, '0')
  return `${year}-${monthKey}-${dayKey}`
}

const emptyStats = (date: string): TodoDailyStats => ({
  date,
  completedSingleTasks: 0,
  incompleteSingleTasks: 0,
  completedProjectSteps: 0,
})

const pointHistoryLabels: Record<TodoPointHistoryItem['type'], string> = {
  single: '通常タスク',
  'project-step': '長期タスク',
  milestone: '区切り達成',
  project: 'Project達成',
}

const formatDetailDate = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateKey

  return date.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

const formatCompletedTime = (dateValue: string): string => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CalendarPanel: React.FC = () => {
  const [todoSession, setTodoSession] = React.useState<TodoSession>(() => readTodoSession())
  const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(null)
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const todoStatsByDate = React.useMemo(
    () => getTodoDailyStats(todoSession.todos),
    [todoSession.todos]
  )
  const selectedStats = selectedDateKey
    ? todoStatsByDate[selectedDateKey] || emptyStats(selectedDateKey)
    : null
  const pointHistory = React.useMemo(
    () =>
      selectedDateKey
        ? getTodoPointHistoryForDate(todoSession.todos, selectedDateKey)
        : [],
    [selectedDateKey, todoSession.todos]
  )

  React.useEffect(() => {
    const syncTodoSession = () => {
      setTodoSession(readTodoSession())
    }

    const handleTodoSessionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      setTodoSession(normalizeTodoSession(customEvent.detail))
    }

    window.addEventListener('storage', syncTodoSession)
    window.addEventListener('todo-session-updated', handleTodoSessionUpdated)

    return () => {
      window.removeEventListener('storage', syncTodoSession)
      window.removeEventListener('todo-session-updated', handleTodoSessionUpdated)
    }
  }, [])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>📅 {monthNames[currentMonth]} {currentYear}</h2>
      </div>

      <div className={styles.content}>
        {selectedDateKey && selectedStats ? (
          <div className={styles.detailView}>
            <button className={styles.backButton} onClick={() => setSelectedDateKey(null)}>
              ← カレンダーに戻る
            </button>

            <div className={styles.detailHeader}>
              <span className={styles.detailDate}>{formatDetailDate(selectedDateKey)}</span>
              <span className={styles.detailCaption}>TODO履歴</span>
            </div>

            <div className={styles.detailSummary}>
              <div className={`${styles.summaryItem} ${styles.summaryCompleted}`}>
                <span className={styles.summaryValue}>{selectedStats.completedSingleTasks}</span>
                <span className={styles.summaryLabel}>達成</span>
              </div>
              <div className={`${styles.summaryItem} ${styles.summaryIncomplete}`}>
                <span className={styles.summaryValue}>{selectedStats.incompleteSingleTasks}</span>
                <span className={styles.summaryLabel}>未達成</span>
              </div>
              <div className={`${styles.summaryItem} ${styles.summaryProject}`}>
                <span className={styles.summaryValue}>{selectedStats.completedProjectSteps}</span>
                <span className={styles.summaryLabel}>長期タスク</span>
              </div>
            </div>

            <div className={styles.historySection}>
              <h3>ポイント獲得履歴</h3>
              {pointHistory.length > 0 ? (
                <div className={styles.historyList}>
                  {pointHistory.map(item => (
                    <div key={item.id} className={styles.historyItem}>
                      <div className={styles.historyMain}>
                        <span className={styles.historyTitle}>{item.title}</span>
                        <span className={styles.historyMeta}>
                          {pointHistoryLabels[item.type]} / {formatCompletedTime(item.completedAt)}
                        </span>
                      </div>
                      <span className={styles.historyPoints}>+{item.points}pt</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyHistory}>
                  この日のポイント獲得履歴はありません。
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.weekdaysRow}>
              {dayNames.map(day => (
                <div key={day} className={styles.weekdayHeader}>{day}</div>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {days.map((day, index) => {
                const dateKey = day ? getCalendarDateKey(currentYear, currentMonth, day) : ''
                const stats = dateKey ? todoStatsByDate[dateKey] || emptyStats(dateKey) : null
                const totalStats = stats
                  ? stats.completedSingleTasks + stats.incompleteSingleTasks + stats.completedProjectSteps
                  : 0

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedDateKey(dateKey)}
                    className={`${styles.dayCell} ${
                      day === today.getDate() && currentMonth === today.getMonth() ? styles.today : ''
                    } ${day ? '' : styles.emptyDay}`}
                  >
                    {day && (
                      <>
                        <span className={styles.dayNumber}>{day}</span>
                        {stats && totalStats > 0 && (
                          <span
                            className={styles.todoStatsBar}
                            aria-label={`通常タスク達成 ${stats.completedSingleTasks}件、通常タスク未達成 ${stats.incompleteSingleTasks}件、長期タスク達成 ${stats.completedProjectSteps}件`}
                          >
                            {stats.completedSingleTasks > 0 && (
                              <span
                                className={`${styles.statBarSegment} ${styles.completedSingle}`}
                                style={{ flexGrow: stats.completedSingleTasks }}
                              />
                            )}
                            {stats.incompleteSingleTasks > 0 && (
                              <span
                                className={`${styles.statBarSegment} ${styles.incompleteSingle}`}
                                style={{ flexGrow: stats.incompleteSingleTasks }}
                              />
                            )}
                            {stats.completedProjectSteps > 0 && (
                              <span
                                className={`${styles.statBarSegment} ${styles.completedProject}`}
                                style={{ flexGrow: stats.completedProjectSteps }}
                              />
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            <div className={styles.todayInfo}>
              Today: {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CalendarPanel

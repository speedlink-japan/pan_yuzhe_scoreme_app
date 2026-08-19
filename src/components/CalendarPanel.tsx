'use client'

import React from 'react'
import styles from './CalendarPanel.module.css'
import {
  TODO_SESSION_STORAGE_KEY,
  TodoDailyStats,
  TodoPointHistoryItem,
  TodoSession,
  getTodoDailyStats,
  getTodoDateKey,
  getTodoPointHistory,
  getTodoPointHistoryForDate,
  getTodoTimestamp,
  mergeTodoPointHistory,
  normalizeTodoSession,
} from '@/utils/todoSession'
import {
  cloneTodoFromHistory,
  createTodoHistoryRedoPlan,
} from '@/utils/todoHistoryRestore'
import { persistTodoSession as persistSyncedTodoSession } from '@/utils/todoSupabaseSync'

type CalendarView = 'calendar' | 'detail' | 'summary'
type SummaryMode = 'week' | 'month' | 'compare'

interface CalendarPanelProps {
  summaryRequestKey?: number
}

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

const startOfWeek = (date: Date): Date => {
  const nextDate = new Date(date)
  const day = nextDate.getDay()
  const diff = day === 0 ? -6 : 1 - day
  nextDate.setDate(nextDate.getDate() + diff)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date: Date, months: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + months, 1)

const formatRangeLabel = (start: Date, end: Date): string => {
  const startLabel = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  const endLabel = end.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

const formatMonthLabel = (date: Date): string =>
  date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

const isDateInRange = (dateKey: string, start: Date, end: Date): boolean => {
  const date = new Date(`${dateKey}T00:00:00`)
  return date >= start && date <= end
}

const summarizeRange = (
  statsByDate: Record<string, TodoDailyStats>,
  pointHistory: TodoPointHistoryItem[],
  start: Date,
  end: Date
) => {
  const stats = Object.values(statsByDate).reduce(
    (summary, item) => {
      if (!isDateInRange(item.date, start, end)) return summary

      return {
        completedSingleTasks: summary.completedSingleTasks + item.completedSingleTasks,
        incompleteSingleTasks: summary.incompleteSingleTasks + item.incompleteSingleTasks,
        completedProjectSteps: summary.completedProjectSteps + item.completedProjectSteps,
      }
    },
    {
      completedSingleTasks: 0,
      incompleteSingleTasks: 0,
      completedProjectSteps: 0,
    }
  )
  const points = pointHistory
    .filter(item => isDateInRange(getTodoDateKey(item.completedAt), start, end))
    .reduce((total, item) => total + item.points, 0)

  return {
    ...stats,
    points,
    completedTotal: stats.completedSingleTasks + stats.completedProjectSteps,
  }
}

const formatDiff = (value: number): string => {
  if (value > 0) return `+${value}`
  return `${value}`
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({ summaryRequestKey = 0 }) => {
  const [todoSession, setTodoSession] = React.useState<TodoSession>(() =>
    normalizeTodoSession(null)
  )
  const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(null)
  const [view, setView] = React.useState<CalendarView>('calendar')
  const [summaryMode, setSummaryMode] = React.useState<SummaryMode>('week')
  const [isSelectingHistory, setIsSelectingHistory] = React.useState(false)
  const [selectedHistoryIds, setSelectedHistoryIds] = React.useState<string[]>([])
  const today = React.useMemo(() => new Date(), [])
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
    () => getTodoDailyStats(todoSession.todos, todoSession.archivedPointHistory),
    [todoSession.todos, todoSession.archivedPointHistory]
  )
  const ledgerPointHistory = React.useMemo(
    () =>
      mergeTodoPointHistory(
        todoSession.archivedPointHistory,
        getTodoPointHistory(
          todoSession.todos,
          todoSession.pendingPointHistory,
          todoSession.hiddenPointHistoryIds,
          todoSession.taskCategories,
          todoSession.pointRules
        )
      ),
    [
      todoSession.archivedPointHistory,
      todoSession.pendingPointHistory,
      todoSession.todos,
      todoSession.hiddenPointHistoryIds,
      todoSession.taskCategories,
      todoSession.pointRules,
    ]
  )
  const allPointHistory = React.useMemo(() => {
    const hiddenIds = new Set(todoSession.hiddenPointHistoryIds)
    return ledgerPointHistory.filter(item => !hiddenIds.has(item.id))
  }, [ledgerPointHistory, todoSession.hiddenPointHistoryIds])
  const selectedStats = selectedDateKey
    ? todoStatsByDate[selectedDateKey] || emptyStats(selectedDateKey)
    : null
  const pointHistory = React.useMemo(
    () =>
      selectedDateKey
        ? getTodoPointHistoryForDate(
            todoSession.todos,
            selectedDateKey,
            todoSession.archivedPointHistory,
            todoSession.pendingPointHistory,
            todoSession.hiddenPointHistoryIds,
            todoSession.taskCategories,
            todoSession.pointRules
          )
        : [],
    [
      selectedDateKey,
      todoSession.todos,
      todoSession.archivedPointHistory,
      todoSession.pendingPointHistory,
      todoSession.hiddenPointHistoryIds,
      todoSession.taskCategories,
      todoSession.pointRules,
    ]
  )
  const currentWeekStart = React.useMemo(() => startOfWeek(today), [today])
  const currentWeekEnd = React.useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart])
  const previousWeekStart = React.useMemo(() => addDays(currentWeekStart, -7), [currentWeekStart])
  const previousWeekEnd = React.useMemo(() => addDays(currentWeekStart, -1), [currentWeekStart])
  const currentMonthStart = React.useMemo(() => startOfMonth(today), [today])
  const currentMonthEnd = React.useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + 1, 0),
    [today]
  )
  const previousMonthStart = React.useMemo(() => addMonths(currentMonthStart, -1), [currentMonthStart])
  const previousMonthEnd = React.useMemo(
    () => new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), 0),
    [currentMonthStart]
  )
  const weeklySummary = React.useMemo(
    () => summarizeRange(todoStatsByDate, allPointHistory, currentWeekStart, currentWeekEnd),
    [todoStatsByDate, allPointHistory, currentWeekStart, currentWeekEnd]
  )
  const previousWeeklySummary = React.useMemo(
    () => summarizeRange(todoStatsByDate, allPointHistory, previousWeekStart, previousWeekEnd),
    [todoStatsByDate, allPointHistory, previousWeekStart, previousWeekEnd]
  )
  const monthlySummary = React.useMemo(
    () => summarizeRange(todoStatsByDate, allPointHistory, currentMonthStart, currentMonthEnd),
    [todoStatsByDate, allPointHistory, currentMonthStart, currentMonthEnd]
  )
  const previousMonthlySummary = React.useMemo(
    () => summarizeRange(todoStatsByDate, allPointHistory, previousMonthStart, previousMonthEnd),
    [todoStatsByDate, allPointHistory, previousMonthStart, previousMonthEnd]
  )

  React.useEffect(() => {
    if (summaryRequestKey === 0) return

    setSelectedDateKey(null)
    setView('summary')
  }, [summaryRequestKey])

  React.useEffect(() => {
    const syncTodoSession = () => {
      setTodoSession(readTodoSession())
    }

    syncTodoSession()

    const handleTodoSessionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      setTodoSession(normalizeTodoSession(customEvent.detail))
    }

    window.addEventListener('storage', syncTodoSession)
    window.addEventListener('todo-session-updated', handleTodoSessionUpdated)
    window.addEventListener('todo-session-external-update', handleTodoSessionUpdated)

    return () => {
      window.removeEventListener('storage', syncTodoSession)
      window.removeEventListener('todo-session-updated', handleTodoSessionUpdated)
      window.removeEventListener('todo-session-external-update', handleTodoSessionUpdated)
    }
  }, [])

  const openSummary = () => {
    setSelectedDateKey(null)
    setView('summary')
  }

  const openCalendar = () => {
    setSelectedDateKey(null)
    setView('calendar')
  }

  const openDetail = (dateKey: string) => {
    setSelectedDateKey(dateKey)
    setView('detail')
    setIsSelectingHistory(false)
    setSelectedHistoryIds([])
  }

  const commitTodoSession = (nextSession: TodoSession): boolean => {
    const updatedAt = getTodoTimestamp()
    try {
      void persistSyncedTodoSession(nextSession, updatedAt).catch(() => undefined)
    } catch {
      window.alert('保存に失敗したため、変更しなかった。')
      return false
    }
    setTodoSession(nextSession)
    window.dispatchEvent(
      new CustomEvent('todo-session-external-update', { detail: nextSession })
    )
    return true
  }

  const copyHistoryItem = (item: TodoPointHistoryItem) => {
    const copiedTodo = cloneTodoFromHistory(item, ledgerPointHistory)
    if (!copiedTodo) {
      window.alert('この履歴はTODOへ戻せる情報がありません。')
      return
    }

    if (!commitTodoSession({
      ...todoSession,
      todos: [...todoSession.todos, copiedTodo],
    })) return
    window.alert('TODOにコピーした。')
  }

  const toggleHistorySelection = (historyId: string) => {
    setSelectedHistoryIds(prev =>
      prev.includes(historyId)
        ? prev.filter(id => id !== historyId)
        : [...prev, historyId]
    )
  }

  const deleteSelectedHistory = () => {
    if (selectedHistoryIds.length === 0) {
      window.alert('削除する履歴を選択して。')
      return
    }

    if (!window.confirm(`選択した${selectedHistoryIds.length}件の履歴を削除する？獲得ptは変わらない。`)) {
      return
    }

    const selectedIds = new Set(selectedHistoryIds)
    if (!commitTodoSession({
      ...todoSession,
      hiddenPointHistoryIds: Array.from(
        new Set([...todoSession.hiddenPointHistoryIds, ...selectedIds])
      ),
    })) return
    setSelectedHistoryIds([])
    setIsSelectingHistory(false)
  }

  const redoHistoryItem = (item: TodoPointHistoryItem) => {
    const redoPlan = createTodoHistoryRedoPlan(item, ledgerPointHistory)
    if (!redoPlan) {
      window.alert('この履歴はTODOへ戻せる情報がありません。')
      return
    }

    const { todo: copiedTodo, historyIds: redoHistoryIds, points: redoPoints } = redoPlan

    if (!window.confirm(`${item.title}をやり直す？${redoPoints}ptを合計から減算してTODOに戻す。`)) {
      return
    }

    if (!commitTodoSession({
      ...todoSession,
      todos: [...todoSession.todos, copiedTodo],
      earnedPoints: todoSession.earnedPoints - redoPoints,
      hiddenPointHistoryIds: Array.from(
        new Set([...todoSession.hiddenPointHistoryIds, ...redoHistoryIds])
      ),
    })) return
    setSelectedHistoryIds(prev => prev.filter(id => !redoHistoryIds.includes(id)))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>📅 {monthNames[currentMonth]} {currentYear}</h2>
        <button
          type="button"
          className={styles.headerButton}
          onClick={view === 'summary' ? openCalendar : openSummary}
        >
          {view === 'summary' ? 'カレンダー' : 'サマリー'}
        </button>
      </div>

      <div className={styles.content}>
        {view === 'summary' ? (
          <div className={styles.summaryView}>
            <div className={styles.detailHeader}>
              <span className={styles.detailDate}>TODOサマリー</span>
              <span className={styles.detailCaption}>
                週・月の達成とポイントをまとめて確認
              </span>
            </div>

            <div className={styles.segmentedControl}>
              <button
                type="button"
                className={`${styles.segmentButton} ${summaryMode === 'week' ? styles.segmentActive : ''}`}
                onClick={() => setSummaryMode('week')}
              >
                週
              </button>
              <button
                type="button"
                className={`${styles.segmentButton} ${summaryMode === 'month' ? styles.segmentActive : ''}`}
                onClick={() => setSummaryMode('month')}
              >
                月
              </button>
              <button
                type="button"
                className={`${styles.segmentButton} ${summaryMode === 'compare' ? styles.segmentActive : ''}`}
                onClick={() => setSummaryMode('compare')}
              >
                比較
              </button>
            </div>

            {summaryMode === 'week' && (
              <div className={styles.summaryContent}>
                <span className={styles.periodLabel}>
                  今週 {formatRangeLabel(currentWeekStart, currentWeekEnd)}
                </span>
                <div className={styles.summaryGrid}>
                  <div className={`${styles.summaryItem} ${styles.summaryPoints}`}>
                    <span className={styles.summaryValue}>{weeklySummary.points}</span>
                    <span className={styles.summaryLabel}>獲得pt</span>
                  </div>
                  <div className={`${styles.summaryItem} ${styles.summaryCompleted}`}>
                    <span className={styles.summaryValue}>{weeklySummary.completedTotal}</span>
                    <span className={styles.summaryLabel}>完了</span>
                  </div>
                  <div className={`${styles.summaryItem} ${styles.summaryProject}`}>
                    <span className={styles.summaryValue}>{weeklySummary.completedProjectSteps}</span>
                    <span className={styles.summaryLabel}>長期タスク</span>
                  </div>
                </div>
              </div>
            )}

            {summaryMode === 'month' && (
              <div className={styles.summaryContent}>
                <span className={styles.periodLabel}>
                  今月 {formatMonthLabel(currentMonthStart)}
                </span>
                <div className={styles.summaryGrid}>
                  <div className={`${styles.summaryItem} ${styles.summaryPoints}`}>
                    <span className={styles.summaryValue}>{monthlySummary.points}</span>
                    <span className={styles.summaryLabel}>獲得pt</span>
                  </div>
                  <div className={`${styles.summaryItem} ${styles.summaryCompleted}`}>
                    <span className={styles.summaryValue}>{monthlySummary.completedTotal}</span>
                    <span className={styles.summaryLabel}>完了</span>
                  </div>
                  <div className={`${styles.summaryItem} ${styles.summaryProject}`}>
                    <span className={styles.summaryValue}>{monthlySummary.completedProjectSteps}</span>
                    <span className={styles.summaryLabel}>長期タスク</span>
                  </div>
                </div>
              </div>
            )}

            {summaryMode === 'compare' && (
              <div className={styles.compareList}>
                <div className={styles.compareBlock}>
                  <div className={styles.compareHeader}>
                    <span>今週 / 前週</span>
                    <span>{formatRangeLabel(previousWeekStart, previousWeekEnd)}</span>
                  </div>
                  <div className={styles.compareGrid}>
                    <span>ポイント</span>
                    <strong>{formatDiff(weeklySummary.points - previousWeeklySummary.points)}pt</strong>
                    <span>完了</span>
                    <strong>{formatDiff(weeklySummary.completedTotal - previousWeeklySummary.completedTotal)}</strong>
                    <span>未完了</span>
                    <strong>{formatDiff(weeklySummary.incompleteSingleTasks - previousWeeklySummary.incompleteSingleTasks)}</strong>
                  </div>
                </div>

                <div className={styles.compareBlock}>
                  <div className={styles.compareHeader}>
                    <span>今月 / 前月</span>
                    <span>{formatMonthLabel(previousMonthStart)}</span>
                  </div>
                  <div className={styles.compareGrid}>
                    <span>ポイント</span>
                    <strong>{formatDiff(monthlySummary.points - previousMonthlySummary.points)}pt</strong>
                    <span>完了</span>
                    <strong>{formatDiff(monthlySummary.completedTotal - previousMonthlySummary.completedTotal)}</strong>
                    <span>未完了</span>
                    <strong>{formatDiff(monthlySummary.incompleteSingleTasks - previousMonthlySummary.incompleteSingleTasks)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : view === 'detail' && selectedDateKey && selectedStats ? (
          <div className={styles.detailView}>
            <button className={styles.backButton} onClick={openCalendar}>
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
              <div className={styles.historyToolbar}>
                <h3>ポイント獲得履歴</h3>
                <div className={styles.historyActions}>
                  {isSelectingHistory ? (
                    <>
                      <button
                        type="button"
                        className={styles.historyActionButton}
                        onClick={deleteSelectedHistory}
                        disabled={selectedHistoryIds.length === 0}
                      >
                        選択削除 {selectedHistoryIds.length > 0 ? `(${selectedHistoryIds.length})` : ''}
                      </button>
                      <button
                        type="button"
                        className={styles.historyActionButton}
                        onClick={() => {
                          setIsSelectingHistory(false)
                          setSelectedHistoryIds([])
                        }}
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.historyActionButton}
                      onClick={() => setIsSelectingHistory(true)}
                    >
                      履歴を選択
                    </button>
                  )}
                </div>
              </div>
              {pointHistory.length > 0 ? (
                <div className={styles.historyList}>
                  {pointHistory.map(item => (
                    <div
                      key={item.id}
                      className={`${styles.historyItem} ${selectedHistoryIds.includes(item.id) ? styles.historyItemSelected : ''}`}
                    >
                      {isSelectingHistory && (
                        <input
                          type="checkbox"
                          className={styles.historyCheckbox}
                          checked={selectedHistoryIds.includes(item.id)}
                          onChange={() => toggleHistorySelection(item.id)}
                          aria-label={`${item.title}を削除対象に選択`}
                        />
                      )}
                      <div className={styles.historyMain}>
                        <span className={styles.historyTitle}>{item.title}</span>
                        <span className={styles.historyMeta}>
                          {pointHistoryLabels[item.type]} / {formatCompletedTime(item.completedAt)}
                        </span>
                      </div>
                      <div className={styles.historyItemActions}>
                        <span className={styles.historyPoints}>+{item.points}pt</span>
                        <button
                          type="button"
                          className={styles.historyItemButton}
                          onClick={() => copyHistoryItem(item)}
                        >
                          コピー
                        </button>
                        <button
                          type="button"
                          className={`${styles.historyItemButton} ${styles.historyRedoButton}`}
                          onClick={() => redoHistoryItem(item)}
                        >
                          やり直し
                        </button>
                      </div>
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
                    onClick={() => day && openDetail(dateKey)}
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

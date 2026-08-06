'use client'

import React, { useMemo, useState } from 'react'
import styles from './ReviewPanel.module.css'
import {
  DailyReview,
  TODO_SESSION_STORAGE_KEY,
  TodoSession,
  getTodoDateKey,
  getTodoTimestamp,
  normalizeTodoSession,
} from '@/utils/todoSession'
import { toggleDailyReviewValue } from '@/utils/pointLedger'
import {
  completeDailyReview,
  getDailyReviewSummary,
  getReviewOutcomesForDate,
  saveDailyReviewDraft,
} from '@/utils/dailyReview'
import { persistTodoSession } from '@/utils/todoSupabaseSync'

const evaluationTags = ['よく頑張った', 'ちょうどよかった', 'ちゃんと休めた']
const typeLabels = { todo: 'Todo', reading: '読書', memo: 'メモ' } as const

const readSession = (): TodoSession => {
  if (typeof window === 'undefined') return normalizeTodoSession(null)
  try {
    const raw = window.localStorage.getItem(TODO_SESSION_STORAGE_KEY)
    return normalizeTodoSession(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeTodoSession(null)
  }
}

const getToday = () => getTodoDateKey(new Date().toISOString())

export default function ReviewPanel() {
  const [session, setSession] = useState<TodoSession>(() => readSession())
  const [date, setDate] = useState(getToday)
  const [saveMessage, setSaveMessage] = useState('')
  const review = session.dailyReviews.find(item => item.date === date)
  const outcomes = useMemo(() => getReviewOutcomesForDate(session, date), [session, date])
  const summary = useMemo(() => getDailyReviewSummary(session, date, outcomes), [session, date, outcomes])

  React.useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<Partial<TodoSession>>).detail
      setSession(detail ? normalizeTodoSession(detail) : readSession())
    }
    window.addEventListener('storage', sync)
    window.addEventListener('todo-session-updated', sync)
    window.addEventListener('todo-session-external-update', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('todo-session-updated', sync)
      window.removeEventListener('todo-session-external-update', sync)
    }
  }, [])

  const persist = (next: TodoSession, message = '下書きを保存した') => {
    const updatedAt = getTodoTimestamp()
    setSession(next)
    setSaveMessage(message)
    void persistTodoSession(next, updatedAt).catch(() => setSaveMessage('保存に失敗した'))
    window.dispatchEvent(new CustomEvent('todo-session-external-update', { detail: next }))
  }

  const saveDraft = (changes: Partial<DailyReview>) => {
    const current = readSession()
    persist(saveDailyReviewDraft(current, date, changes, getTodoTimestamp()))
  }

  const shiftDate = (days: number) => {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + days)
    setDate(getTodoDateKey(next.toISOString()))
    setSaveMessage('')
  }

  const hanamaru = review?.hanamaruSourceIds ?? []
  const selectedTags = review?.selfEvaluationTags ?? []

  return (
    <section className={styles.panel} aria-label="1日の見直し">
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Daily Review</p><h2>🌸 1日の見直し</h2></div>
        {review?.awarded && <span className={styles.doneBadge}>見直し済み</span>}
      </header>

      <div className={styles.body}>
        <div className={styles.dateNav}>
          <button onClick={() => shiftDate(-1)} aria-label="前の日">‹</button>
          <input type="date" value={date} onChange={event => { setDate(event.target.value); setSaveMessage('') }} aria-label="見直す日" />
          <button onClick={() => shiftDate(1)} aria-label="次の日">›</button>
          <button className={styles.todayButton} onClick={() => setDate(getToday())}>今日へ</button>
        </div>

        <div className={styles.reviewGrid}>
          <div className={styles.sideColumn}>
            <section className={styles.summaryCard} aria-label="日別ポイントと記録件数">
              <h3>この日の記録</h3>
              <div className={styles.pointGrid}>
                <div><span>頑張り</span><strong>{summary.effort}pt</strong></div>
                <div><span>休憩</span><strong>{summary.rest}pt</strong></div>
                <div><span>合計</span><strong>{summary.total}pt</strong></div>
              </div>
              <div className={styles.counts}>
                <span>Todo {summary.todoCount}</span><span>読書 {summary.readingCount}</span><span>メモ {summary.memoCount}</span>
              </div>
            </section>

            <section className={styles.formCard}>
              <h3>今の自分に近いもの</h3>
              <div className={styles.tags}>
                {evaluationTags.map(tag => <button key={tag} type="button" aria-pressed={selectedTags.includes(tag)} className={selectedTags.includes(tag) ? styles.selectedTag : ''} onClick={() => saveDraft({ selfEvaluationTags: toggleDailyReviewValue(selectedTags, tag) })}>{tag}</button>)}
              </div>
              <label>よかったこと<textarea key={`good-${date}-${review?.updatedAt ?? 'new'}`} defaultValue={review?.goodThings ?? review?.note ?? ''} onBlur={event => saveDraft({ goodThings: event.target.value, note: event.target.value })} placeholder="ひとことでも、空欄でも大丈夫" /></label>
              <label>明日の自分へ<textarea key={`tomorrow-${date}-${review?.updatedAt ?? 'new'}`} defaultValue={review?.tomorrowNote ?? ''} onBlur={event => saveDraft({ tomorrowNote: event.target.value })} placeholder="覚えておきたいことがあれば" /></label>
              <button className={styles.completeButton} onClick={() => {
                const current = readSession()
                const latestReview = current.dailyReviews.find(item => item.date === date)
                persist(completeDailyReview(current, date, latestReview ?? {}, getTodoTimestamp()), latestReview?.awarded ? '見直しを更新した（追加ポイントなし）' : '見直しを完了した')
              }}>{review?.awarded ? '見直しを更新する' : '今日を見直した'}</button>
              <p className={styles.saveMessage} role="status">{saveMessage || '入力とはなまるは下書き保存される'}</p>
            </section>
          </div>

          <section className={styles.outcomesSection}>
            <div className={styles.sectionTitle}><div><h3>今日の成果</h3><p>残しておきたいものに、はなまるを。</p></div><span>{hanamaru.length} 🌸</span></div>
            <div className={styles.outcomes}>
              {outcomes.map(outcome => {
                const selected = hanamaru.includes(outcome.sourceId)
                return <button key={outcome.sourceId} type="button" className={`${styles.outcomeCard} ${selected ? styles.hanamaru : ''}`} aria-pressed={selected} aria-label={`${outcome.title}にはなまるを${selected ? '外す' : '付ける'}`} onClick={() => saveDraft({ hanamaruSourceIds: toggleDailyReviewValue(hanamaru, outcome.sourceId) })}>
                  <span className={styles.outcomeType}>{typeLabels[outcome.type]}</span>
                  <strong>{outcome.title}</strong>
                  {outcome.detail && <small>{outcome.detail}</small>}
                  <span className={styles.outcomeMeta}>{outcome.account === 'rest' ? '休憩' : '頑張り'} +{outcome.points}pt <b aria-hidden="true">{selected ? '🌸' : '○'}</b></span>
                </button>
              })}
              {outcomes.length === 0 && <div className={styles.empty}><span>🌱</span><strong>まだ成果カードはない日</strong><p>今日ここを開けたことも、ひとつの記録。</p></div>}
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

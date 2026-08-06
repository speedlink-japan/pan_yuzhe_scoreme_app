import {
  DailyReview,
  PointAccount,
  PointLedgerEntry,
  createDailyReviewDraft,
  getPointBalances,
  upsertDailyReview,
  upsertPointLedgerEntry,
} from './pointLedger'
import {
  TodoSession,
  getTodoDateKey,
  getTodoPointHistoryForDate,
  normalizeTodoSession,
} from './todoSession'

export type ReviewOutcomeType = 'todo' | 'reading' | 'memo'

export interface ReviewOutcome {
  sourceId: string
  type: ReviewOutcomeType
  title: string
  occurredAt: string
  account: PointAccount
  points: number
  detail?: string
}

export interface DailyReviewSummary {
  effort: number
  rest: number
  total: number
  todoCount: number
  readingCount: number
  memoCount: number
}

export const getReviewOutcomesForDate = (
  session: TodoSession,
  date: string
): ReviewOutcome[] => {
  const todos: ReviewOutcome[] = getTodoPointHistoryForDate(
    session.todos,
    date,
    session.archivedPointHistory,
    session.pendingPointHistory,
    session.hiddenPointHistoryIds,
    session.taskCategories,
    session.pointRules
  ).map(item => ({
    sourceId: item.sourceId ?? `todo:${item.id}`,
    type: 'todo',
    title: item.title,
    occurredAt: item.completedAt,
    account: item.account ?? session.pointRules.todoAccount,
    points: item.points,
  }))
  const reading: ReviewOutcome[] = session.studyBooks
    .filter(book => getTodoDateKey(book.createdAt) === date)
    .map(book => ({
      sourceId: `reading:${book.id}`,
      type: 'reading',
      title: book.title,
      occurredAt: book.createdAt,
      account: book.pointAccount ?? session.pointRules.readingAccount,
      points: book.points,
      detail: `${book.pageCount}ページ`,
    }))
  const memos: ReviewOutcome[] = session.notebookMemos
    .filter(memo => getTodoDateKey(memo.createdAt) === date)
    .map(memo => ({
      sourceId: `memo:${memo.id}`,
      type: 'memo',
      title: memo.title,
      occurredAt: memo.createdAt,
      account: memo.pointAccount ?? session.pointRules.memoAccount,
      points: memo.points,
      detail: memo.content.slice(0, 80),
    }))

  return Array.from(new Map([...todos, ...reading, ...memos]
    .map(outcome => [outcome.sourceId, outcome])).values())
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

export const getDailyReviewSummary = (
  session: TodoSession,
  date: string,
  outcomes = getReviewOutcomesForDate(session, date)
): DailyReviewSummary => {
  const balances = getPointBalances(session.pointLedger.filter(
    entry => getTodoDateKey(entry.occurredAt) === date
  ))
  return {
    ...balances,
    todoCount: outcomes.filter(item => item.type === 'todo').length,
    readingCount: outcomes.filter(item => item.type === 'reading').length,
    memoCount: outcomes.filter(item => item.type === 'memo').length,
  }
}

export const saveDailyReviewDraft = (
  session: TodoSession,
  date: string,
  changes: Partial<DailyReview>,
  updatedAt = new Date().toISOString()
): TodoSession => normalizeTodoSession({
  ...session,
  dailyReviews: upsertDailyReview(session.dailyReviews, { date, ...changes }, updatedAt),
}, updatedAt)

const hasReviewAwardForDate = (
  ledger: PointLedgerEntry[],
  date: string
): boolean => ledger.some(entry =>
  entry.sourceType === 'review' && entry.sourceId === `review:${date}`
)

const getReviewLedgerOccurredAt = (date: string, fallback: string): string => {
  const localNoon = new Date(`${date}T12:00:00`)
  return Number.isNaN(localNoon.getTime()) ? fallback : localNoon.toISOString()
}

export const completeDailyReview = (
  session: TodoSession,
  date: string,
  changes: Partial<DailyReview> = {},
  completedAt = new Date().toISOString()
): TodoSession => {
  const existing = session.dailyReviews.find(review => review.date === date)
    ?? createDailyReviewDraft(date, completedAt)
  const wasAwarded = existing.awarded || hasReviewAwardForDate(session.pointLedger, date)
  const reviews = upsertDailyReview(session.dailyReviews, {
    ...existing,
    ...changes,
    date,
    completedAt: existing.completedAt ?? completedAt,
    awarded: true,
  }, completedAt)
  const pointLedger = wasAwarded ? session.pointLedger : upsertPointLedgerEntry(
    session.pointLedger,
    {
      id: `ledger-review-${date}`,
      sourceType: 'review',
      sourceId: `review:${date}`,
      title: `${date}の見直し`,
      account: session.pointRules.reviewAccount,
      points: session.pointRules.reviewPoints,
      occurredAt: getReviewLedgerOccurredAt(date, completedAt),
      reason: '日次見直し',
    },
    completedAt
  )
  return normalizeTodoSession({ ...session, dailyReviews: reviews, pointLedger }, completedAt)
}

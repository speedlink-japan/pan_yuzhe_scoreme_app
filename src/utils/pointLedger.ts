export type PointAccount = 'effort' | 'rest'

export type PointSourceType =
  | 'todo'
  | 'reading'
  | 'memo'
  | 'review'
  | 'manual-adjustment'

export type ReadingCategory = 'manga' | 'magazine' | 'bunko' | 'textbook' | 'paper'

export interface PointLedgerEntry {
  id: string
  sourceType: PointSourceType
  sourceId: string
  title: string
  account: PointAccount
  points: number
  occurredAt: string
  reason?: string
}

export interface PointRules {
  todoAccount: PointAccount
  readingAccount: PointAccount
  memoAccount: PointAccount
  reviewAccount: PointAccount
  reviewPoints: number
  readingPagesPerPoint: Record<ReadingCategory, number>
  memoCharactersPerPoint: number
}

export interface TaskCategory {
  id: string
  name: string
  account: PointAccount
  points: number
  color?: string
}

export interface TaskPreset {
  id: string
  title: string
  categoryId?: string
  account: PointAccount
  points: number
}

export interface DailyReview {
  id: string
  date: string
  note: string
  completedAt: string
  awarded: boolean
}

export interface PointBalances {
  effort: number
  rest: number
  total: number
}

export const DEFAULT_POINT_RULES: PointRules = {
  todoAccount: 'effort',
  readingAccount: 'effort',
  memoAccount: 'effort',
  reviewAccount: 'effort',
  reviewPoints: 3,
  readingPagesPerPoint: {
    manga: 20,
    magazine: 12,
    bunko: 10,
    textbook: 5,
    paper: 2,
  },
  memoCharactersPerPoint: 100,
}

const isPointAccount = (value: unknown): value is PointAccount =>
  value === 'effort' || value === 'rest'

const isPointSourceType = (value: unknown): value is PointSourceType =>
  value === 'todo' ||
  value === 'reading' ||
  value === 'memo' ||
  value === 'review' ||
  value === 'manual-adjustment'

const normalizeInteger = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback

const normalizePositiveInteger = (value: unknown, fallback: number): number => {
  const normalized = normalizeInteger(value, fallback)
  return normalized > 0 ? normalized : fallback
}

const normalizeAwardPoints = (value: unknown): number => Math.max(0, normalizeInteger(value))

const normalizeAwardPointsOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : undefined

export const normalizePointRules = (value: Partial<PointRules> | null | undefined): PointRules => {
  const readingRules = value?.readingPagesPerPoint

  return {
    todoAccount: isPointAccount(value?.todoAccount)
      ? value.todoAccount
      : DEFAULT_POINT_RULES.todoAccount,
    readingAccount: isPointAccount(value?.readingAccount)
      ? value.readingAccount
      : DEFAULT_POINT_RULES.readingAccount,
    memoAccount: isPointAccount(value?.memoAccount)
      ? value.memoAccount
      : DEFAULT_POINT_RULES.memoAccount,
    reviewAccount: isPointAccount(value?.reviewAccount)
      ? value.reviewAccount
      : DEFAULT_POINT_RULES.reviewAccount,
    reviewPoints:
      normalizeAwardPointsOrUndefined(value?.reviewPoints) ?? DEFAULT_POINT_RULES.reviewPoints,
    readingPagesPerPoint: {
      manga: normalizePositiveInteger(readingRules?.manga, DEFAULT_POINT_RULES.readingPagesPerPoint.manga),
      magazine: normalizePositiveInteger(readingRules?.magazine, DEFAULT_POINT_RULES.readingPagesPerPoint.magazine),
      bunko: normalizePositiveInteger(readingRules?.bunko, DEFAULT_POINT_RULES.readingPagesPerPoint.bunko),
      textbook: normalizePositiveInteger(readingRules?.textbook, DEFAULT_POINT_RULES.readingPagesPerPoint.textbook),
      paper: normalizePositiveInteger(readingRules?.paper, DEFAULT_POINT_RULES.readingPagesPerPoint.paper),
    },
    memoCharactersPerPoint: normalizePositiveInteger(
      value?.memoCharactersPerPoint,
      DEFAULT_POINT_RULES.memoCharactersPerPoint
    ),
  }
}

export const normalizePointLedgerEntry = (
  value: Partial<PointLedgerEntry>,
  fallbackDate: string
): PointLedgerEntry | null => {
  if (
    typeof value.sourceId !== 'string' ||
    value.sourceId.length === 0 ||
    !isPointSourceType(value.sourceType)
  ) {
    return null
  }

  const rawPoints = normalizeInteger(value.points)
  const points = value.sourceType === 'manual-adjustment' ? rawPoints : Math.max(0, rawPoints)

  return {
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : `ledger-${value.sourceId}`,
    sourceType: value.sourceType,
    sourceId: value.sourceId,
    title: typeof value.title === 'string' ? value.title : '',
    account: isPointAccount(value.account) ? value.account : 'effort',
    points,
    occurredAt:
      typeof value.occurredAt === 'string' && value.occurredAt.length > 0
        ? value.occurredAt
        : fallbackDate,
    reason: typeof value.reason === 'string' && value.reason.length > 0 ? value.reason : undefined,
  }
}

export const normalizePointLedger = (
  value: Partial<PointLedgerEntry>[] | undefined,
  fallbackDate: string
): PointLedgerEntry[] => {
  if (!Array.isArray(value)) return []

  return value.reduce<PointLedgerEntry[]>((ledger, entry) => {
    const normalized = normalizePointLedgerEntry(entry, fallbackDate)
    return normalized ? upsertPointLedgerEntry(ledger, normalized, fallbackDate) : ledger
  }, [])
}

export const upsertPointLedgerEntry = (
  ledger: PointLedgerEntry[],
  entry: Partial<PointLedgerEntry>,
  fallbackDate = new Date().toISOString()
): PointLedgerEntry[] => {
  const normalized = normalizePointLedgerEntry(entry, fallbackDate)
  if (!normalized) return ledger.slice()

  const existingIndex = ledger.findIndex(item => item.sourceId === normalized.sourceId)
  if (existingIndex < 0) return [...ledger, normalized]

  return ledger.map((item, index) => (index === existingIndex ? normalized : item))
}

export const getPointBalances = (ledger: PointLedgerEntry[]): PointBalances => {
  const balances = ledger.reduce<PointBalances>(
    (result, entry) => {
      result[entry.account] += entry.points
      result.total += entry.points
      return result
    },
    { effort: 0, rest: 0, total: 0 }
  )

  return balances
}

export const getPointLedgerByDate = (
  ledger: PointLedgerEntry[]
): Record<string, PointLedgerEntry[]> =>
  ledger.reduce<Record<string, PointLedgerEntry[]>>((history, entry) => {
    const parsed = new Date(entry.occurredAt)
    const date = Number.isNaN(parsed.getTime())
      ? entry.occurredAt.slice(0, 10)
      : `${parsed.getFullYear()}-${`${parsed.getMonth() + 1}`.padStart(2, '0')}-${`${parsed.getDate()}`.padStart(2, '0')}`
    history[date] = [...(history[date] ?? []), entry]
    return history
  }, {})

export const calculateReadingPoints = (
  category: ReadingCategory,
  pageCount: number,
  rules: PointRules = DEFAULT_POINT_RULES
): number => Math.floor(Math.max(0, Math.trunc(pageCount)) / rules.readingPagesPerPoint[category])

export const calculateMemoPoints = (
  characterCount: number,
  rules: PointRules = DEFAULT_POINT_RULES
): number => Math.floor(Math.max(0, Math.trunc(characterCount)) / rules.memoCharactersPerPoint)

export const normalizeTaskCategories = (
  value: Partial<TaskCategory>[] | undefined
): TaskCategory[] => {
  if (!Array.isArray(value)) return []
  return value.reduce<TaskCategory[]>((items, item) => {
    if (typeof item.id !== 'string' || typeof item.name !== 'string') return items
    items.push({
      id: item.id,
      name: item.name,
      account: isPointAccount(item.account) ? item.account : 'effort',
      points: normalizeAwardPoints(item.points),
      color: typeof item.color === 'string' ? item.color : undefined,
    })
    return items
  }, [])
}

export const normalizeTaskPresets = (value: Partial<TaskPreset>[] | undefined): TaskPreset[] => {
  if (!Array.isArray(value)) return []
  return value.reduce<TaskPreset[]>((items, item) => {
    if (typeof item.id !== 'string' || typeof item.title !== 'string') return items
    items.push({
      id: item.id,
      title: item.title,
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : undefined,
      account: isPointAccount(item.account) ? item.account : 'effort',
      points: normalizeAwardPoints(item.points),
    })
    return items
  }, [])
}

export const normalizeDailyReviews = (
  value: Partial<DailyReview>[] | undefined,
  fallbackDate: string
): DailyReview[] => {
  if (!Array.isArray(value)) return []
  return value.reduce<DailyReview[]>((items, item) => {
    if (typeof item.id !== 'string') return items
    items.push({
      id: item.id,
      date: typeof item.date === 'string' ? item.date : fallbackDate.slice(0, 10),
      note: typeof item.note === 'string' ? item.note : '',
      completedAt:
        typeof item.completedAt === 'string' && item.completedAt.length > 0
          ? item.completedAt
          : fallbackDate,
      awarded: Boolean(item.awarded),
    })
    return items
  }, [])
}

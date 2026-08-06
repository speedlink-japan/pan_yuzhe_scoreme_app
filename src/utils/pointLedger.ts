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
  difficulty?: 'easy' | 'medium' | 'hard'
  account?: PointAccount
  points?: number
}

export interface DailyReview {
  id: string
  date: string
  note: string
  hanamaruSourceIds?: string[]
  selfEvaluationTags?: string[]
  goodThings?: string
  tomorrowNote?: string
  updatedAt?: string
  completedAt?: string
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
): number => {
  if (typeof pageCount !== 'number' || !Number.isFinite(pageCount) || pageCount <= 0) return 0
  const normalizedRules = normalizePointRules(rules)
  const pagesPerPoint = normalizedRules.readingPagesPerPoint[category]
  if (!pagesPerPoint) return 0
  return Math.max(1, Math.floor(pageCount / pagesPerPoint))
}

export const calculateMemoPoints = (
  characterCount: number,
  rules: PointRules = DEFAULT_POINT_RULES
): number => {
  if (
    typeof characterCount !== 'number' ||
    !Number.isFinite(characterCount) ||
    characterCount <= 0
  ) return 0
  const normalizedRules = normalizePointRules(rules)
  return Math.max(1, Math.floor(characterCount / normalizedRules.memoCharactersPerPoint))
}

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
    const difficulty =
      item.difficulty === 'easy' || item.difficulty === 'medium' || item.difficulty === 'hard'
        ? item.difficulty
        : undefined
    items.push({
      id: item.id,
      title: item.title,
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : undefined,
      difficulty,
      account: isPointAccount(item.account) ? item.account : undefined,
      points: normalizeAwardPointsOrUndefined(item.points),
    })
    return items
  }, [])
}

export const updatePointLedgerEntries = (
  ledger: PointLedgerEntry[],
  ids: string[],
  changes: { account?: PointAccount; points?: number }
): PointLedgerEntry[] => {
  const selected = new Set(ids)
  const points =
    typeof changes.points === 'number' && Number.isFinite(changes.points)
      ? Math.trunc(changes.points)
      : undefined

  return ledger.map(entry => {
    if (!selected.has(entry.id)) return entry
    const nextPoints = points ?? entry.points
    return {
      ...entry,
      account: changes.account ?? entry.account,
      points: entry.sourceType === 'manual-adjustment' ? nextPoints : Math.max(0, nextPoints),
    }
  })
}

export const createManualAdjustment = (
  account: PointAccount,
  points: number,
  reason: string,
  occurredAt = new Date().toISOString(),
  id = `manual-${occurredAt}-${Math.random().toString(36).slice(2)}`
): PointLedgerEntry => ({
  id,
  sourceType: 'manual-adjustment',
  sourceId: `manual:${id}`,
  title: '手動調整',
  account,
  points: Math.trunc(points),
  occurredAt,
  reason: reason.trim(),
})

export const normalizeDailyReviews = (
  value: Partial<DailyReview>[] | undefined,
  fallbackDate: string
): DailyReview[] => {
  if (!Array.isArray(value)) return []
  return value.reduce<DailyReview[]>((items, item) => {
    const fallbackDateKey = fallbackDate.slice(0, 10)
    const rawDate = typeof item.date === 'string' ? item.date : ''
    const [year, month, day] = rawDate.split('-').map(Number)
    const parsedDate = new Date(Date.UTC(year, month - 1, day))
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day
    const date = isValidDate ? rawDate : fallbackDateKey
    const note = typeof item.note === 'string' ? item.note : ''
    const completedAt = typeof item.completedAt === 'string' && item.completedAt.length > 0
      ? item.completedAt
      : undefined
    const normalized: DailyReview = {
      id: `daily-review:${date}`,
      date,
      note,
      hanamaruSourceIds: Array.from(new Set(
        Array.isArray(item.hanamaruSourceIds)
          ? item.hanamaruSourceIds.filter(id => typeof id === 'string' && id.length > 0)
          : []
      )),
      selfEvaluationTags: Array.from(new Set(
        Array.isArray(item.selfEvaluationTags)
          ? item.selfEvaluationTags.filter(tag => typeof tag === 'string' && tag.length > 0)
          : []
      )),
      goodThings: typeof item.goodThings === 'string' ? item.goodThings : note,
      tomorrowNote: typeof item.tomorrowNote === 'string' ? item.tomorrowNote : '',
      updatedAt: typeof item.updatedAt === 'string' && item.updatedAt.length > 0
        ? item.updatedAt
        : completedAt ?? fallbackDate,
      completedAt,
      awarded: Boolean(item.awarded),
    }
    const existingIndex = items.findIndex(review => review.date === date)
    if (existingIndex < 0) return [...items, normalized]

    const existing = items[existingIndex]
    const merged: DailyReview = {
      ...existing,
      ...normalized,
      hanamaruSourceIds: Array.from(new Set([
        ...(existing.hanamaruSourceIds ?? []),
        ...(normalized.hanamaruSourceIds ?? []),
      ])),
      selfEvaluationTags: Array.from(new Set([
        ...(existing.selfEvaluationTags ?? []),
        ...(normalized.selfEvaluationTags ?? []),
      ])),
      goodThings: normalized.goodThings || existing.goodThings || '',
      tomorrowNote: normalized.tomorrowNote || existing.tomorrowNote || '',
      completedAt: normalized.completedAt ?? existing.completedAt,
      awarded: existing.awarded || normalized.awarded,
    }
    return items.map((review, index) => index === existingIndex ? merged : review)
  }, [])
}

export const normalizeDailyReviewLedgerSources = (
  ledger: PointLedgerEntry[],
  rawReviews: Partial<DailyReview>[] | undefined,
  fallbackDate: string
): PointLedgerEntry[] => {
  if (!Array.isArray(rawReviews)) return ledger.slice()

  const legacySourceToCanonical = new Map<string, string>()
  rawReviews.forEach(review => {
    if (typeof review.id !== 'string' || review.id.length === 0) return
    const normalized = normalizeDailyReviews([review], fallbackDate)[0]
    if (!normalized) return
    legacySourceToCanonical.set(`review:${review.id}`, `review:${normalized.date}`)
  })

  const canonicalSources = new Set(legacySourceToCanonical.values())
  const claimedCanonicalSources = new Set(
    ledger
      .filter(entry => entry.sourceType === 'review' && canonicalSources.has(entry.sourceId))
      .map(entry => entry.sourceId)
  )

  return ledger.reduce<PointLedgerEntry[]>((normalizedLedger, entry) => {
    if (entry.sourceType !== 'review') return [...normalizedLedger, entry]

    const canonicalSourceId = legacySourceToCanonical.get(entry.sourceId)
    if (!canonicalSourceId || canonicalSourceId === entry.sourceId) {
      return upsertPointLedgerEntry(normalizedLedger, entry, fallbackDate)
    }
    if (claimedCanonicalSources.has(canonicalSourceId)) return normalizedLedger

    claimedCanonicalSources.add(canonicalSourceId)
    return upsertPointLedgerEntry(normalizedLedger, {
      ...entry,
      sourceId: canonicalSourceId,
    }, fallbackDate)
  }, [])
}

export const createDailyReviewDraft = (date: string, updatedAt: string): DailyReview => ({
  id: `daily-review:${date}`,
  date,
  note: '',
  hanamaruSourceIds: [],
  selfEvaluationTags: [],
  goodThings: '',
  tomorrowNote: '',
  updatedAt,
  awarded: false,
})

export const upsertDailyReview = (
  reviews: DailyReview[],
  review: Partial<DailyReview> & { date: string },
  updatedAt = new Date().toISOString()
): DailyReview[] => {
  const existing = reviews.find(item => item.date === review.date)
  const next = normalizeDailyReviews([{
    ...(existing ?? createDailyReviewDraft(review.date, updatedAt)),
    ...review,
    id: `daily-review:${review.date}`,
    updatedAt,
  }], updatedAt)[0]
  return [...reviews.filter(item => item.date !== next.date), next]
    .sort((a, b) => a.date.localeCompare(b.date))
}

export const toggleDailyReviewValue = (values: string[], value: string): string[] =>
  values.includes(value) ? values.filter(item => item !== value) : [...values, value]

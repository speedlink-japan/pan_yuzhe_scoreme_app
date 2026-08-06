import {
  DailyReview,
  PointAccount,
  PointLedgerEntry,
  PointRules,
  ReadingCategory,
  TaskCategory,
  TaskPreset,
  calculateMemoPoints,
  calculateReadingPoints,
  getPointBalances,
  normalizeDailyReviews,
  normalizePointLedger,
  normalizePointRules,
  normalizeTaskCategories,
  normalizeTaskPresets,
  upsertPointLedgerEntry,
} from './pointLedger'

export type {
  DailyReview,
  PointAccount,
  PointBalances,
  PointLedgerEntry,
  PointRules,
  PointSourceType,
  TaskCategory,
  TaskPreset,
} from './pointLedger'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Step {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
  rewardPoints?: number
}

export interface Milestone {
  id: string
  name: string
  steps: Step[]
  completed: boolean
  completedAt?: string
  bonusPoints?: number
}

export interface Project {
  id: string
  name: string
  milestones: Milestone[]
  completed: boolean
  createdAt: string
  completedAt?: string
  bonusPoints?: number
  categoryId?: string
  pointAccount?: PointAccount
  pointOverride?: number
}

export interface SingleTask {
  id: string
  text: string
  difficulty: Difficulty
  completed: boolean
  createdAt: string
  completedAt?: string
  categoryId?: string
  pointAccount?: PointAccount
  pointOverride?: number
}

export interface TodoItem {
  type: 'single' | 'project'
  data: SingleTask | Project
}

export type StudyCategory = ReadingCategory

export interface StudyBookRecord {
  id: string
  title: string
  category: StudyCategory
  pageCount: number
  createdAt: string
  points: number
  pointAccount?: PointAccount
}

export interface NotebookMemoRecord {
  id: string
  title: string
  content: string
  color: string
  createdAt: string
  points: number
  pointAccount?: PointAccount
}

export interface CharacterShopState {
  spentPoints: number
  outfit: string
  activeItem: string
  ownedItems: string[]
}

export interface TodoSession {
  todos: TodoItem[]
  earnedPoints: number
  archivedPointHistory: TodoPointHistoryItem[]
  pendingPointHistory: TodoPointHistoryItem[]
  hiddenPointHistoryIds: string[]
  studyBooks: StudyBookRecord[]
  notebookMemos: NotebookMemoRecord[]
  characterShop: CharacterShopState
  pointLedger: PointLedgerEntry[]
  pointRules: PointRules
  taskCategories: TaskCategory[]
  taskPresets: TaskPreset[]
  dailyReviews: DailyReview[]
}

export interface TodoDailyStats {
  date: string
  completedSingleTasks: number
  incompleteSingleTasks: number
  completedProjectSteps: number
}

export interface TodoPointHistoryItem {
  id: string
  title: string
  type: 'single' | 'project-step' | 'milestone' | 'project'
  points: number
  completedAt: string
  account?: PointAccount
  sourceId?: string
  sourceTodo?: TodoItem
  sourceMilestoneId?: string
  sourceStepId?: string
}

export const TODO_SESSION_STORAGE_KEY = 'myscore.todo.session.v1'

export const getTodoTimestamp = () => new Date().toISOString()

export const TODO_DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
}

export const TODO_STEP_POINTS = 8
export const TODO_MILESTONE_POINTS = 10
export const TODO_PROJECT_POINTS = 50
export const NOTEBOOK_CHARACTERS_PER_POINT = 100
const LEGACY_STUDY_POINTS_PER_PAGE = 3
const LEGACY_NOTEBOOK_CHARACTERS_PER_POINT = 10

export const DEFAULT_CHARACTER_SHOP_STATE: CharacterShopState = {
  spentPoints: 0,
  outfit: 'whiteSkirt',
  activeItem: 'none',
  ownedItems: ['whiteSkirt', 'none'],
}

export const createDefaultTodos = (createdAt = getTodoTimestamp()): TodoItem[] => [
  {
    type: 'single',
    data: {
      id: '1',
      text: 'Sample Easy Task',
      difficulty: 'easy',
      completed: false,
      createdAt,
    },
  },
  {
    type: 'single',
    data: {
      id: '2',
      text: 'Sample Medium Task',
      difficulty: 'medium',
      completed: false,
      createdAt,
    },
  },
]

const createTimestampForToday = (hour: number, minute: number): string => {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export const createDemoTodoSession = (): TodoSession => {
  const todayStart = createTimestampForToday(8, 0)
  const morningDone = createTimestampForToday(9, 15)
  const focusDone = createTimestampForToday(10, 10)
  const stepOneDone = createTimestampForToday(11, 0)
  const stepTwoDone = createTimestampForToday(11, 40)

  return {
    earnedPoints: 71,
    archivedPointHistory: [],
    pendingPointHistory: [],
    hiddenPointHistoryIds: [],
    studyBooks: [],
    notebookMemos: [],
    characterShop: DEFAULT_CHARACTER_SHOP_STATE,
    pointLedger: [],
    pointRules: normalizePointRules(undefined),
    taskCategories: [],
    taskPresets: [],
    dailyReviews: [],
    todos: [
      {
        type: 'single',
        data: {
          id: 'demo-single-done-easy',
          text: '朝の確認を終える',
          difficulty: 'easy',
          completed: true,
          createdAt: todayStart,
          completedAt: morningDone,
        },
      },
      {
        type: 'single',
        data: {
          id: 'demo-single-done-medium',
          text: 'カレンダー表示を確認する',
          difficulty: 'medium',
          completed: true,
          createdAt: todayStart,
          completedAt: focusDone,
        },
      },
      {
        type: 'single',
        data: {
          id: 'demo-single-open-medium',
          text: '日別詳細の見せ方を決める',
          difficulty: 'medium',
          completed: false,
          createdAt: todayStart,
        },
      },
      {
        type: 'single',
        data: {
          id: 'demo-single-open-hard',
          text: 'ポイント履歴の確認を仕上げる',
          difficulty: 'hard',
          completed: false,
          createdAt: todayStart,
        },
      },
      {
        type: 'project',
        data: {
          id: 'demo-project-calendar-history',
          name: 'カレンダー履歴改善',
          createdAt: todayStart,
          completed: false,
          milestones: [
            {
              id: 'demo-milestone-history-base',
              name: '履歴の土台',
              completed: true,
              completedAt: stepTwoDone,
              steps: [
                {
                  id: 'demo-step-history-data',
                  text: '完了日時を保存する',
                  completed: true,
                  createdAt: todayStart,
                  completedAt: stepOneDone,
                },
                {
                  id: 'demo-step-history-calendar',
                  text: 'カレンダーに進捗バーを表示する',
                  completed: true,
                  createdAt: todayStart,
                  completedAt: stepTwoDone,
                },
              ],
            },
            {
              id: 'demo-milestone-history-detail',
              name: '日別詳細',
              completed: false,
              steps: [
                {
                  id: 'demo-step-detail-summary',
                  text: '3分類のまとめを表示する',
                  completed: false,
                  createdAt: todayStart,
                },
                {
                  id: 'demo-step-detail-points',
                  text: 'ポイント獲得履歴を表示する',
                  completed: false,
                  createdAt: todayStart,
                },
              ],
            },
          ],
        },
      },
    ],
  }
}

const isDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'medium' || value === 'hard'

const normalizeDate = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback

const normalizeNonNegativePoints = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : undefined

const normalizePointAccount = (value: unknown): PointAccount | undefined =>
  value === 'effort' || value === 'rest' ? value : undefined

const normalizeCompletedDate = (
  completed: boolean,
  value: unknown,
  fallback: string
): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value
  return completed ? fallback : undefined
}

const normalizeStep = (value: Partial<Step>, fallbackDate: string): Step => {
  const completed = Boolean(value.completed)

  return {
    id: typeof value.id === 'string' ? value.id : `step-${fallbackDate}`,
    text: typeof value.text === 'string' ? value.text : '',
    completed,
    createdAt: normalizeDate(value.createdAt, fallbackDate),
    completedAt: normalizeCompletedDate(completed, value.completedAt, fallbackDate),
    rewardPoints: normalizeNonNegativePoints(value.rewardPoints),
  }
}

const normalizeSingleTask = (value: Partial<SingleTask>, fallbackDate: string): SingleTask => {
  const completed = Boolean(value.completed)

  return {
    id: typeof value.id === 'string' ? value.id : `task-${fallbackDate}`,
    text: typeof value.text === 'string' ? value.text : '',
    difficulty: isDifficulty(value.difficulty) ? value.difficulty : 'medium',
    completed,
    createdAt: normalizeDate(value.createdAt, fallbackDate),
    completedAt: normalizeCompletedDate(completed, value.completedAt, fallbackDate),
    categoryId: typeof value.categoryId === 'string' ? value.categoryId : undefined,
    pointAccount: normalizePointAccount(value.pointAccount),
    pointOverride: normalizeNonNegativePoints(value.pointOverride),
  }
}

const normalizeProject = (value: Partial<Project>, fallbackDate: string): Project => {
  const milestones = Array.isArray(value.milestones)
    ? value.milestones.map((milestone, index) => ({
        id: typeof milestone.id === 'string' ? milestone.id : `milestone-${index}-${fallbackDate}`,
        name: typeof milestone.name === 'string' ? milestone.name : '',
        steps: Array.isArray(milestone.steps)
          ? milestone.steps.map(step => normalizeStep(step, fallbackDate))
          : [],
        completed: Boolean(milestone.completed),
        completedAt: normalizeCompletedDate(
          Boolean(milestone.completed),
          milestone.completedAt,
          fallbackDate
        ),
        bonusPoints: normalizeNonNegativePoints(milestone.bonusPoints),
      }))
    : []
  const completed = Boolean(value.completed)

  return {
    id: typeof value.id === 'string' ? value.id : `project-${fallbackDate}`,
    name: typeof value.name === 'string' ? value.name : '',
    milestones,
    completed,
    createdAt: normalizeDate(value.createdAt, fallbackDate),
    completedAt: normalizeCompletedDate(completed, value.completedAt, fallbackDate),
    bonusPoints: normalizeNonNegativePoints(value.bonusPoints),
    categoryId: typeof value.categoryId === 'string' ? value.categoryId : undefined,
    pointAccount: normalizePointAccount(value.pointAccount),
    pointOverride: normalizeNonNegativePoints(value.pointOverride),
  }
}

const normalizeTodoItems = (
  todos: Partial<TodoItem>[] | undefined,
  fallbackDate: string
): TodoItem[] => {
  if (!Array.isArray(todos)) return createDefaultTodos(fallbackDate)

  return todos.reduce<TodoItem[]>((items, todo) => {
    if (todo.type === 'single') {
      items.push({
        type: 'single',
        data: normalizeSingleTask(todo.data as Partial<SingleTask>, fallbackDate),
      })
    }

    if (todo.type === 'project') {
      items.push({
        type: 'project',
        data: normalizeProject(todo.data as Partial<Project>, fallbackDate),
      })
    }

    return items
  }, [])
}

const isPointHistoryType = (value: unknown): value is TodoPointHistoryItem['type'] =>
  value === 'single' || value === 'project-step' || value === 'milestone' || value === 'project'

const normalizePointHistoryItem = (
  value: Partial<TodoPointHistoryItem>,
  fallbackDate: string
): TodoPointHistoryItem | null => {
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !isPointHistoryType(value.type) ||
    typeof value.points !== 'number' ||
    !Number.isFinite(value.points) ||
    value.points < 0
  ) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    type: value.type,
    points: Math.trunc(value.points),
    completedAt: normalizeDate(value.completedAt, fallbackDate),
    account: normalizePointAccount(value.account),
    sourceId:
      typeof value.sourceId === 'string' && value.sourceId.length > 0
        ? value.sourceId
        : `todo:${value.id}`,
    sourceTodo: value.sourceTodo
      ? normalizeTodoItems([value.sourceTodo], fallbackDate)[0]
      : undefined,
    sourceMilestoneId:
      typeof value.sourceMilestoneId === 'string' ? value.sourceMilestoneId : undefined,
    sourceStepId: typeof value.sourceStepId === 'string' ? value.sourceStepId : undefined,
  }
}

const normalizePointHistory = (
  value: Partial<TodoPointHistoryItem>[] | undefined,
  fallbackDate: string
): TodoPointHistoryItem[] => {
  if (!Array.isArray(value)) return []

  const normalized = value
    .map(item => normalizePointHistoryItem(item, fallbackDate))
    .filter((item): item is TodoPointHistoryItem => item !== null)

  return Array.from(new Map(normalized.map(item => [item.id, item])).values())
}

const normalizeHistoryIds = (value: string[] | undefined): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter(item => typeof item === 'string' && item.length > 0)))
    : []

const isStudyCategory = (value: unknown): value is StudyCategory =>
  value === 'manga' ||
  value === 'bunko' ||
  value === 'magazine' ||
  value === 'textbook' ||
  value === 'paper'

const isPointAccount = (value: unknown): value is PointAccount =>
  value === 'effort' || value === 'rest'

const normalizeStudyBooks = (
  value: Partial<StudyBookRecord>[] | undefined,
  fallbackDate: string,
  pointRules: PointRules,
  isLegacySession: boolean,
  pointLedger: PointLedgerEntry[]
): StudyBookRecord[] => {
  if (!Array.isArray(value)) return []

  return value.reduce<StudyBookRecord[]>((books, book) => {
    if (
      typeof book.id !== 'string' ||
      typeof book.title !== 'string' ||
      !isStudyCategory(book.category) ||
      typeof book.pageCount !== 'number' ||
      !Number.isFinite(book.pageCount) ||
      book.pageCount <= 0
    ) {
      return books
    }

    const pageCount = Math.floor(book.pageCount)
    const existingAward = pointLedger.find(entry => entry.sourceId === `reading:${book.id}`)
    const savedOrCalculatedPoints = normalizeNonNegativePoints(book.points) ?? (isLegacySession
      ? pageCount * LEGACY_STUDY_POINTS_PER_PAGE
      : calculateReadingPoints(book.category, pageCount, pointRules))
    books.push({
      id: book.id,
      title: book.title,
      category: book.category,
      pageCount,
      createdAt: normalizeDate(book.createdAt, fallbackDate),
      points: existingAward?.points ?? savedOrCalculatedPoints,
      pointAccount: existingAward?.account ?? (isPointAccount(book.pointAccount)
        ? book.pointAccount
        : pointRules.readingAccount),
    })
    return books
  }, [])
}

const normalizeNotebookMemos = (
  value: Partial<NotebookMemoRecord>[] | undefined,
  fallbackDate: string,
  pointRules: PointRules,
  isLegacySession: boolean,
  pointLedger: PointLedgerEntry[]
): NotebookMemoRecord[] => {
  if (!Array.isArray(value)) return []

  return value.reduce<NotebookMemoRecord[]>((memos, memo) => {
    if (
      typeof memo.id !== 'string' ||
      typeof memo.title !== 'string' ||
      typeof memo.content !== 'string'
    ) {
      return memos
    }

    const existingAward = pointLedger.find(entry => entry.sourceId === `memo:${memo.id}`)
    const savedOrCalculatedPoints = normalizeNonNegativePoints(memo.points) ?? (isLegacySession
      ? Math.floor(memo.content.length / LEGACY_NOTEBOOK_CHARACTERS_PER_POINT)
      : calculateMemoPoints(memo.content.length, pointRules))
    memos.push({
      id: memo.id,
      title: memo.title,
      content: memo.content,
      color: typeof memo.color === 'string' ? memo.color : '#FFB6C1',
      createdAt: normalizeDate(memo.createdAt, fallbackDate),
      points: existingAward?.points ?? savedOrCalculatedPoints,
      pointAccount: existingAward?.account ?? (isPointAccount(memo.pointAccount)
        ? memo.pointAccount
        : pointRules.memoAccount),
    })
    return memos
  }, [])
}

const normalizeCharacterShop = (
  value: Partial<CharacterShopState> | undefined
): CharacterShopState => ({
  spentPoints:
    typeof value?.spentPoints === 'number' &&
    Number.isFinite(value.spentPoints) &&
    value.spentPoints >= 0
      ? Math.trunc(value.spentPoints)
      : 0,
  outfit: typeof value?.outfit === 'string' ? value.outfit : DEFAULT_CHARACTER_SHOP_STATE.outfit,
  activeItem:
    typeof value?.activeItem === 'string'
      ? value.activeItem
      : DEFAULT_CHARACTER_SHOP_STATE.activeItem,
  ownedItems: Array.from(
    new Set([
      ...DEFAULT_CHARACTER_SHOP_STATE.ownedItems,
      ...(Array.isArray(value?.ownedItems)
        ? value.ownedItems.filter(item => typeof item === 'string')
        : []),
    ])
  ),
})

const migrateLegacyPointLedger = (
  ledger: PointLedgerEntry[],
  earnedPoints: number,
  archivedPointHistory: TodoPointHistoryItem[],
  studyBooks: StudyBookRecord[],
  notebookMemos: NotebookMemoRecord[],
  dailyReviews: DailyReview[],
  pointRules: PointRules,
  fallbackDate: string
): PointLedgerEntry[] => {
  let migrated = ledger

  const addIfMissing = (entry: Partial<PointLedgerEntry>) => {
    if (
      typeof entry.sourceId === 'string' &&
      !migrated.some(item => item.sourceId === entry.sourceId)
    ) {
      migrated = upsertPointLedgerEntry(migrated, entry, fallbackDate)
    }
  }

  archivedPointHistory.forEach(item => {
    addIfMissing({
      id: `ledger-todo-${item.id}`,
      sourceType: 'todo',
      sourceId: item.sourceId ?? `todo:${item.id}`,
      title: item.title,
      account: item.account ?? pointRules.todoAccount,
      points: item.points,
      occurredAt: item.completedAt,
      reason: '旧Todo履歴から移行',
    })
  })

  const archivedPoints = archivedPointHistory.reduce((total, item) => total + item.points, 0)
  const legacyBalance = earnedPoints - archivedPoints
  if (legacyBalance !== 0) {
    addIfMissing({
      id: 'ledger-legacy-earned-balance',
      sourceType: 'manual-adjustment',
      sourceId: 'migration:legacy-earned-balance',
      title: '既存Todoポイント残高',
      account: pointRules.todoAccount,
      points: legacyBalance,
      occurredAt: fallbackDate,
      reason: '既存のearnedPoints合計を維持するための移行差分',
    })
  }

  studyBooks.forEach(book => {
    addIfMissing({
      id: `ledger-reading-${book.id}`,
      sourceType: 'reading',
      sourceId: `reading:${book.id}`,
      title: book.title,
      account: book.pointAccount ?? pointRules.readingAccount,
      points: book.points,
      occurredAt: book.createdAt,
      reason: '読書記録',
    })
  })

  notebookMemos.forEach(memo => {
    addIfMissing({
      id: `ledger-memo-${memo.id}`,
      sourceType: 'memo',
      sourceId: `memo:${memo.id}`,
      title: memo.title,
      account: memo.pointAccount ?? pointRules.memoAccount,
      points: memo.points,
      occurredAt: memo.createdAt,
      reason: 'メモ記録',
    })
  })

  dailyReviews.filter(review => review.awarded).forEach(review => {
    addIfMissing({
      id: `ledger-review-${review.id}`,
      sourceType: 'review',
      sourceId: `review:${review.id}`,
      title: `${review.date}の見直し`,
      account: pointRules.reviewAccount,
      points: pointRules.reviewPoints,
      occurredAt: review.completedAt,
      reason: '日次見直し',
    })
  })

  return migrated
}

const reconcilePendingHistory = (
  todos: TodoItem[],
  pendingHistory: TodoPointHistoryItem[],
  hiddenHistoryIds: string[],
  categories: TaskCategory[],
  pointRules: PointRules
): TodoPointHistoryItem[] => {
  const pendingIds = new Set(pendingHistory.map(item => item.id))
  const hiddenIds = new Set(hiddenHistoryIds)
  const candidates: TodoPointHistoryItem[] = []

  todos.forEach(todo => {
    if (todo.type === 'single') {
      const task = todo.data as SingleTask
      const id = `single-${task.id}`
      if (task.completed && task.completedAt && pendingIds.has(id) && !hiddenIds.has(id)) {
        const reward = resolveTodoReward(todo, categories, pointRules)
        candidates.push({
          id,
          title: task.text,
          type: 'single',
          points: pendingHistory.find(item => item.id === id)?.points ?? reward.points,
          account: pendingHistory.find(item => item.id === id)?.account ?? reward.account,
          sourceId: pendingHistory.find(item => item.id === id)?.sourceId ?? `todo:${id}`,
          completedAt: task.completedAt,
          sourceTodo: todo,
        })
      }
      return
    }

    const project = todo.data as Project
    project.milestones.forEach(milestone => {
      milestone.steps.forEach(step => {
        const id = `step-${project.id}-${milestone.id}-${step.id}`
        if (step.completed && step.completedAt && pendingIds.has(id) && !hiddenIds.has(id)) {
          const reward = resolveTodoReward(todo, categories, pointRules, getTodoStepPoints(step))
          candidates.push({
            id,
            title: `${project.name} / ${step.text}`,
            type: 'project-step',
            points: pendingHistory.find(item => item.id === id)?.points ?? getTodoStepPoints(step),
            account: pendingHistory.find(item => item.id === id)?.account ?? reward.account,
            sourceId: pendingHistory.find(item => item.id === id)?.sourceId ?? `todo:${id}`,
            completedAt: step.completedAt,
            sourceTodo: todo,
            sourceMilestoneId: milestone.id,
            sourceStepId: step.id,
          })
        }
      })

      const milestoneId = `milestone-${project.id}-${milestone.id}`
      if (
        milestone.completed &&
        milestone.completedAt &&
        pendingIds.has(milestoneId) &&
        !hiddenIds.has(milestoneId)
      ) {
        const reward = resolveTodoReward(todo, categories, pointRules, getTodoMilestonePoints(milestone))
        candidates.push({
          id: milestoneId,
          title: `${project.name} / ${milestone.name}`,
          type: 'milestone',
          points: pendingHistory.find(item => item.id === milestoneId)?.points ?? getTodoMilestonePoints(milestone),
          account: pendingHistory.find(item => item.id === milestoneId)?.account ?? reward.account,
          sourceId: pendingHistory.find(item => item.id === milestoneId)?.sourceId ?? `todo:${milestoneId}`,
          completedAt: milestone.completedAt,
          sourceTodo: todo,
          sourceMilestoneId: milestone.id,
        })
      }
    })

    const projectId = `project-${project.id}`
    if (
      project.completed &&
      project.completedAt &&
      pendingIds.has(projectId) &&
      !hiddenIds.has(projectId)
    ) {
      const reward = resolveTodoReward(todo, categories, pointRules)
      candidates.push({
        id: projectId,
        title: project.name,
        type: 'project',
        points: pendingHistory.find(item => item.id === projectId)?.points ?? reward.points,
        account: pendingHistory.find(item => item.id === projectId)?.account ?? reward.account,
        sourceId: pendingHistory.find(item => item.id === projectId)?.sourceId ?? `todo:${projectId}`,
        completedAt: project.completedAt,
        sourceTodo: todo,
      })
    }
  })

  return candidates
}

export const normalizeTodoSession = (
  value: Partial<TodoSession> | null | undefined,
  fallbackDate = getTodoTimestamp()
): TodoSession => {
  const todos = normalizeTodoItems(value?.todos, fallbackDate)
  const pointRules = normalizePointRules(value?.pointRules)
  const taskCategories = normalizeTaskCategories(value?.taskCategories)
  const hiddenPointHistoryIds = normalizeHistoryIds(value?.hiddenPointHistoryIds)
  const pendingPointHistory = reconcilePendingHistory(
    todos,
    normalizePointHistory(value?.pendingPointHistory, fallbackDate),
    hiddenPointHistoryIds,
    taskCategories,
    pointRules
  )
  const earnedPoints =
    typeof value?.earnedPoints === 'number' && Number.isFinite(value.earnedPoints)
      ? Math.trunc(value.earnedPoints)
      : 0
  const archivedPointHistory = normalizePointHistory(value?.archivedPointHistory, fallbackDate)
  const isLegacySession = value?.pointRules === undefined
  const normalizedLedger = normalizePointLedger(value?.pointLedger, fallbackDate)
  const studyBooks = normalizeStudyBooks(
    value?.studyBooks,
    fallbackDate,
    pointRules,
    isLegacySession,
    normalizedLedger
  )
  const notebookMemos = normalizeNotebookMemos(
    value?.notebookMemos,
    fallbackDate,
    pointRules,
    isLegacySession,
    normalizedLedger
  )
  const dailyReviews = normalizeDailyReviews(value?.dailyReviews, fallbackDate)
  const pointLedger = migrateLegacyPointLedger(
    normalizedLedger,
    earnedPoints,
    archivedPointHistory,
    studyBooks,
    notebookMemos,
    dailyReviews,
    pointRules,
    fallbackDate
  )

  return {
    todos,
    earnedPoints,
    archivedPointHistory,
    pendingPointHistory,
    hiddenPointHistoryIds,
    studyBooks,
    notebookMemos,
    characterShop: normalizeCharacterShop(value?.characterShop),
    pointLedger,
    pointRules,
    taskCategories,
    taskPresets: normalizeTaskPresets(value?.taskPresets),
    dailyReviews,
  }
}

export const getStudyPoints = (books: StudyBookRecord[]): number =>
  books.reduce((total, book) => total + book.points, 0)

export const getNotebookPoints = (memos: NotebookMemoRecord[]): number =>
  memos.reduce((total, memo) => total + memo.points, 0)

export const getAvailablePoints = (session: TodoSession): number =>
  getPointBalances(session.pointLedger).total - session.characterShop.spentPoints

export const getTodoStepPoints = (step: Step): number =>
  normalizeNonNegativePoints(step.rewardPoints) ?? TODO_STEP_POINTS

export const getTodoMilestonePoints = (milestone: Milestone): number =>
  normalizeNonNegativePoints(milestone.bonusPoints) ?? TODO_MILESTONE_POINTS

export const getTodoProjectPoints = (project: Project): number =>
  normalizeNonNegativePoints(project.bonusPoints) ?? TODO_PROJECT_POINTS

export const resolveTodoReward = (
  todo: TodoItem,
  categories: TaskCategory[],
  pointRules: PointRules,
  basePoints?: number
): { account: PointAccount; points: number } => {
  const item = todo.data as SingleTask | Project
  const category = categories.find(candidate => candidate.id === item.categoryId)
  const defaultPoints =
    basePoints ??
    (todo.type === 'single'
      ? TODO_DIFFICULTY_POINTS[(item as SingleTask).difficulty]
      : getTodoProjectPoints(item as Project))

  return {
    account: item.pointAccount ?? category?.account ?? pointRules.todoAccount ?? 'effort',
    points:
      basePoints === undefined
        ? item.pointOverride ?? category?.points ?? defaultPoints
        : basePoints,
  }
}

export const createSingleTaskFromPreset = (
  preset: TaskPreset,
  createdAt = getTodoTimestamp(),
  id = `task-${createdAt}-${Math.random().toString(36).slice(2)}`
): TodoItem => ({
  type: 'single',
  data: {
    id,
    text: preset.title,
    difficulty: preset.difficulty ?? 'medium',
    completed: false,
    createdAt,
    categoryId: preset.categoryId,
    pointAccount: preset.account,
    pointOverride: preset.points,
  },
})

export const getTodoDateKey = (dateValue: string): string => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue.slice(0, 10)

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createEmptyDailyStats = (date: string): TodoDailyStats => ({
  date,
  completedSingleTasks: 0,
  incompleteSingleTasks: 0,
  completedProjectSteps: 0,
})

const ensureDailyStats = (
  statsByDate: Record<string, TodoDailyStats>,
  date: string
): TodoDailyStats => {
  if (!statsByDate[date]) {
    statsByDate[date] = createEmptyDailyStats(date)
  }

  return statsByDate[date]
}

export const getTodoDailyStats = (
  todos: TodoItem[],
  archivedPointHistory: TodoPointHistoryItem[] = []
): Record<string, TodoDailyStats> => {
  const statsByDate = todos.reduce<Record<string, TodoDailyStats>>((statsByDate, todo) => {
    if (todo.type === 'single') {
      const task = todo.data as SingleTask

      if (task.completed && task.completedAt) {
        ensureDailyStats(statsByDate, getTodoDateKey(task.completedAt)).completedSingleTasks += 1
      } else if (!task.completed) {
        const stats = ensureDailyStats(statsByDate, getTodoDateKey(task.createdAt))
        stats.incompleteSingleTasks += 1
      }

      return statsByDate
    }

    const project = todo.data as Project
    project.milestones.forEach(milestone => {
      milestone.steps.forEach(step => {
        if (step.completed && step.completedAt) {
          ensureDailyStats(statsByDate, getTodoDateKey(step.completedAt)).completedProjectSteps += 1
        } else if (!step.completed) {
          ensureDailyStats(statsByDate, getTodoDateKey(step.createdAt))
        }
      })
    })

    return statsByDate
  }, {})

  archivedPointHistory.forEach(item => {
    const stats = ensureDailyStats(statsByDate, getTodoDateKey(item.completedAt))

    if (item.type === 'single') {
      stats.completedSingleTasks += 1
    }

    if (item.type === 'project-step') {
      stats.completedProjectSteps += 1
    }
  })

  return statsByDate
}

const getLatestCompletedAt = (completedDates: string[]): string | undefined => {
  if (completedDates.length === 0) return undefined

  return completedDates.reduce((latest, current) => {
    const latestTime = new Date(latest).getTime()
    const currentTime = new Date(current).getTime()

    if (Number.isNaN(latestTime)) return current
    if (Number.isNaN(currentTime)) return latest

    return currentTime > latestTime ? current : latest
  })
}

export const getTodoPointHistoryForDate = (
  todos: TodoItem[],
  date: string,
  archivedPointHistory: TodoPointHistoryItem[] = [],
  pendingPointHistory: TodoPointHistoryItem[] = [],
  hiddenPointHistoryIds: string[] = [],
  taskCategories: TaskCategory[] = [],
  pointRules: PointRules = normalizePointRules(undefined)
): TodoPointHistoryItem[] => {
  const hiddenIds = new Set(hiddenPointHistoryIds)
  const history = getTodoPointHistory(
    todos,
    pendingPointHistory,
    hiddenPointHistoryIds,
    taskCategories,
    pointRules
  ).filter(
    item => getTodoDateKey(item.completedAt) === date
  )
  const archivedHistory = archivedPointHistory.filter(
    item => getTodoDateKey(item.completedAt) === date && !hiddenIds.has(item.id)
  )

  return mergeTodoPointHistory(archivedHistory, history).sort((a, b) => {
    const aTime = new Date(a.completedAt).getTime()
    const bTime = new Date(b.completedAt).getTime()
    return aTime - bTime
  })
}

export const getTodoPointHistory = (
  todos: TodoItem[],
  pendingPointHistory: TodoPointHistoryItem[] = [],
  hiddenPointHistoryIds: string[] = [],
  taskCategories: TaskCategory[] = [],
  pointRules: PointRules = normalizePointRules(undefined)
): TodoPointHistoryItem[] => {
  const pendingIds = new Set(pendingPointHistory.map(item => item.id))
  const hiddenIds = new Set(hiddenPointHistoryIds)

  return todos.reduce<TodoPointHistoryItem[]>((items, todo) => {
    if (todo.type === 'single') {
      const task = todo.data as SingleTask

      const historyId = `single-${task.id}`
      if (task.completedAt && !pendingIds.has(historyId) && !hiddenIds.has(historyId)) {
        const reward = resolveTodoReward(todo, taskCategories, pointRules)
        items.push({
          id: historyId,
          title: task.text,
          type: 'single',
          points: reward.points,
          account: reward.account,
          sourceId: `todo:${historyId}`,
          completedAt: task.completedAt,
          sourceTodo: todo,
        })
      }

      return items
    }

    const project = todo.data as Project

    project.milestones.forEach(milestone => {
      milestone.steps.forEach(step => {
        const historyId = `step-${project.id}-${milestone.id}-${step.id}`
        if (step.completedAt && !pendingIds.has(historyId) && !hiddenIds.has(historyId)) {
          const reward = resolveTodoReward(todo, taskCategories, pointRules, getTodoStepPoints(step))
          items.push({
            id: historyId,
            title: `${project.name} / ${step.text}`,
            type: 'project-step',
            points: getTodoStepPoints(step),
            account: reward.account,
            sourceId: `todo:${historyId}`,
            completedAt: step.completedAt,
            sourceTodo: todo,
            sourceMilestoneId: milestone.id,
            sourceStepId: step.id,
          })
        }
      })

      const milestoneCompletedAt =
        milestone.completedAt ||
        (milestone.completed
          ? getLatestCompletedAt(
              milestone.steps
                .filter(step => step.completedAt)
                .map(step => step.completedAt as string)
            )
          : undefined)

      const milestoneHistoryId = `milestone-${project.id}-${milestone.id}`
      if (
        milestoneCompletedAt &&
        !pendingIds.has(milestoneHistoryId) &&
        !hiddenIds.has(milestoneHistoryId)
      ) {
        const reward = resolveTodoReward(todo, taskCategories, pointRules, getTodoMilestonePoints(milestone))
        items.push({
          id: milestoneHistoryId,
          title: `${project.name} / ${milestone.name}`,
          type: 'milestone',
          points: getTodoMilestonePoints(milestone),
          account: reward.account,
          sourceId: `todo:${milestoneHistoryId}`,
          completedAt: milestoneCompletedAt,
          sourceTodo: todo,
          sourceMilestoneId: milestone.id,
        })
      }
    })

    const projectHistoryId = `project-${project.id}`
    if (
      project.completedAt &&
      !pendingIds.has(projectHistoryId) &&
      !hiddenIds.has(projectHistoryId)
    ) {
      const reward = resolveTodoReward(todo, taskCategories, pointRules)
      items.push({
        id: projectHistoryId,
        title: project.name,
        type: 'project',
        points: reward.points,
        account: reward.account,
        sourceId: `todo:${projectHistoryId}`,
        completedAt: project.completedAt,
        sourceTodo: todo,
      })
    }

    return items
  }, [])
}

export const getTodoPendingPoints = (pendingPointHistory: TodoPointHistoryItem[]): number =>
  pendingPointHistory.reduce((total, item) => total + item.points, 0)

export const mergeTodoPointHistory = (
  currentHistory: TodoPointHistoryItem[],
  incomingHistory: TodoPointHistoryItem[]
): TodoPointHistoryItem[] => {
  const historyById = new Map<string, TodoPointHistoryItem>()

  currentHistory.forEach(item => {
    historyById.set(item.id, item)
  })

  incomingHistory.forEach(item => {
    historyById.set(item.id, item)
  })

  return Array.from(historyById.values()).sort((a, b) => {
    const aTime = new Date(a.completedAt).getTime()
    const bTime = new Date(b.completedAt).getTime()
    return aTime - bTime
  })
}

export const finalizeTodoDelivery = (
  session: TodoSession,
  activeTodos: TodoItem[] = session.todos
): TodoSession => {
  const delivered = session.pendingPointHistory
  const pointLedger = delivered.reduce(
    (ledger, item) => upsertPointLedgerEntry(ledger, {
      id: `ledger-${item.id}`,
      sourceType: 'todo',
      sourceId: item.sourceId ?? `todo:${item.id}`,
      title: item.title,
      account: item.account ?? session.pointRules.todoAccount,
      points: item.points,
      occurredAt: item.completedAt,
      reason: 'Todo納品',
    }),
    session.pointLedger
  )

  return {
    ...session,
    todos: activeTodos,
    earnedPoints: session.earnedPoints + getTodoPendingPoints(delivered),
    archivedPointHistory: mergeTodoPointHistory(session.archivedPointHistory, delivered),
    pendingPointHistory: [],
    pointLedger,
  }
}

import {
  DailyReview,
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
}

export interface SingleTask {
  id: string
  text: string
  difficulty: Difficulty
  completed: boolean
  createdAt: string
  completedAt?: string
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
}

export interface NotebookMemoRecord {
  id: string
  title: string
  content: string
  color: string
  createdAt: string
  points: number
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

const normalizeStudyBooks = (
  value: Partial<StudyBookRecord>[] | undefined,
  fallbackDate: string,
  pointRules: PointRules,
  isLegacySession: boolean
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
    books.push({
      id: book.id,
      title: book.title,
      category: book.category,
      pageCount,
      createdAt: normalizeDate(book.createdAt, fallbackDate),
      points:
        isLegacySession
          ? pageCount * LEGACY_STUDY_POINTS_PER_PAGE
          : normalizeNonNegativePoints(book.points) ??
            calculateReadingPoints(book.category, pageCount, pointRules),
    })
    return books
  }, [])
}

const normalizeNotebookMemos = (
  value: Partial<NotebookMemoRecord>[] | undefined,
  fallbackDate: string,
  pointRules: PointRules,
  isLegacySession: boolean
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

    memos.push({
      id: memo.id,
      title: memo.title,
      content: memo.content,
      color: typeof memo.color === 'string' ? memo.color : '#FFB6C1',
      createdAt: normalizeDate(memo.createdAt, fallbackDate),
      points:
        isLegacySession
          ? Math.floor(memo.content.length / LEGACY_NOTEBOOK_CHARACTERS_PER_POINT)
          : normalizeNonNegativePoints(memo.points) ??
            calculateMemoPoints(memo.content.length, pointRules),
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

  archivedPointHistory.forEach(item => {
    migrated = upsertPointLedgerEntry(migrated, {
      id: `ledger-todo-${item.id}`,
      sourceType: 'todo',
      sourceId: `todo:${item.id}`,
      title: item.title,
      account: pointRules.todoAccount,
      points: item.points,
      occurredAt: item.completedAt,
      reason: '旧Todo履歴から移行',
    }, fallbackDate)
  })

  const archivedPoints = archivedPointHistory.reduce((total, item) => total + item.points, 0)
  const legacyBalance = earnedPoints - archivedPoints
  const existingLegacyBalance = migrated.find(
    item => item.sourceId === 'migration:legacy-earned-balance'
  )
  if (
    legacyBalance !== 0 ||
    existingLegacyBalance
  ) {
    migrated = upsertPointLedgerEntry(migrated, {
      id: 'ledger-legacy-earned-balance',
      sourceType: 'manual-adjustment',
      sourceId: 'migration:legacy-earned-balance',
      title: '既存Todoポイント残高',
      account: pointRules.todoAccount,
      points: legacyBalance,
      occurredAt: existingLegacyBalance?.occurredAt ?? fallbackDate,
      reason: '既存のearnedPoints合計を維持するための移行差分',
    }, fallbackDate)
  }

  studyBooks.forEach(book => {
    migrated = upsertPointLedgerEntry(migrated, {
      id: `ledger-reading-${book.id}`,
      sourceType: 'reading',
      sourceId: `reading:${book.id}`,
      title: book.title,
      account: pointRules.readingAccount,
      points: book.points,
      occurredAt: book.createdAt,
      reason: '読書記録',
    }, fallbackDate)
  })

  notebookMemos.forEach(memo => {
    migrated = upsertPointLedgerEntry(migrated, {
      id: `ledger-memo-${memo.id}`,
      sourceType: 'memo',
      sourceId: `memo:${memo.id}`,
      title: memo.title,
      account: pointRules.memoAccount,
      points: memo.points,
      occurredAt: memo.createdAt,
      reason: 'メモ記録',
    }, fallbackDate)
  })

  dailyReviews.filter(review => review.awarded).forEach(review => {
    migrated = upsertPointLedgerEntry(migrated, {
      id: `ledger-review-${review.id}`,
      sourceType: 'review',
      sourceId: `review:${review.id}`,
      title: `${review.date}の見直し`,
      account: pointRules.reviewAccount,
      points: pointRules.reviewPoints,
      occurredAt: review.completedAt,
      reason: '日次見直し',
    }, fallbackDate)
  })

  return migrated
}

const reconcilePendingHistory = (
  todos: TodoItem[],
  pendingHistory: TodoPointHistoryItem[],
  hiddenHistoryIds: string[]
): TodoPointHistoryItem[] => {
  const pendingIds = new Set(pendingHistory.map(item => item.id))
  const hiddenIds = new Set(hiddenHistoryIds)
  const candidates: TodoPointHistoryItem[] = []

  todos.forEach(todo => {
    if (todo.type === 'single') {
      const task = todo.data as SingleTask
      const id = `single-${task.id}`
      if (task.completed && task.completedAt && pendingIds.has(id) && !hiddenIds.has(id)) {
        candidates.push({
          id,
          title: task.text,
          type: 'single',
          points: TODO_DIFFICULTY_POINTS[task.difficulty],
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
          candidates.push({
            id,
            title: `${project.name} / ${step.text}`,
            type: 'project-step',
            points: normalizeNonNegativePoints(step.rewardPoints) ?? TODO_STEP_POINTS,
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
        candidates.push({
          id: milestoneId,
          title: `${project.name} / ${milestone.name}`,
          type: 'milestone',
          points: normalizeNonNegativePoints(milestone.bonusPoints) ?? TODO_MILESTONE_POINTS,
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
      candidates.push({
        id: projectId,
        title: project.name,
        type: 'project',
        points: normalizeNonNegativePoints(project.bonusPoints) ?? TODO_PROJECT_POINTS,
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
  const hiddenPointHistoryIds = normalizeHistoryIds(value?.hiddenPointHistoryIds)
  const pendingPointHistory = reconcilePendingHistory(
    todos,
    normalizePointHistory(value?.pendingPointHistory, fallbackDate),
    hiddenPointHistoryIds
  )
  const earnedPoints =
    typeof value?.earnedPoints === 'number' && Number.isFinite(value.earnedPoints)
      ? Math.trunc(value.earnedPoints)
      : 0
  const archivedPointHistory = normalizePointHistory(value?.archivedPointHistory, fallbackDate)
  const isLegacySession = value?.pointRules === undefined
  const pointRules = normalizePointRules(value?.pointRules)
  const studyBooks = normalizeStudyBooks(
    value?.studyBooks,
    fallbackDate,
    pointRules,
    isLegacySession
  )
  const notebookMemos = normalizeNotebookMemos(
    value?.notebookMemos,
    fallbackDate,
    pointRules,
    isLegacySession
  )
  const dailyReviews = normalizeDailyReviews(value?.dailyReviews, fallbackDate)
  const pointLedger = migrateLegacyPointLedger(
    normalizePointLedger(value?.pointLedger, fallbackDate),
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
    taskCategories: normalizeTaskCategories(value?.taskCategories),
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
  hiddenPointHistoryIds: string[] = []
): TodoPointHistoryItem[] => {
  const hiddenIds = new Set(hiddenPointHistoryIds)
  const history = getTodoPointHistory(todos, pendingPointHistory, hiddenPointHistoryIds).filter(
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
  hiddenPointHistoryIds: string[] = []
): TodoPointHistoryItem[] => {
  const pendingIds = new Set(pendingPointHistory.map(item => item.id))
  const hiddenIds = new Set(hiddenPointHistoryIds)

  return todos.reduce<TodoPointHistoryItem[]>((items, todo) => {
    if (todo.type === 'single') {
      const task = todo.data as SingleTask

      const historyId = `single-${task.id}`
      if (task.completedAt && !pendingIds.has(historyId) && !hiddenIds.has(historyId)) {
        items.push({
          id: historyId,
          title: task.text,
          type: 'single',
          points: TODO_DIFFICULTY_POINTS[task.difficulty],
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
          items.push({
            id: historyId,
            title: `${project.name} / ${step.text}`,
            type: 'project-step',
            points: getTodoStepPoints(step),
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
        items.push({
          id: milestoneHistoryId,
          title: `${project.name} / ${milestone.name}`,
          type: 'milestone',
          points: getTodoMilestonePoints(milestone),
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
      items.push({
        id: projectHistoryId,
        title: project.name,
        type: 'project',
        points: getTodoProjectPoints(project),
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

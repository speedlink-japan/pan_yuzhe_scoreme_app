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

export interface TodoSession {
  todos: TodoItem[]
  earnedPoints: number
  archivedPointHistory: TodoPointHistoryItem[]
  pendingPointHistory: TodoPointHistoryItem[]
  hiddenPointHistoryIds: string[]
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
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined

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
    points: value.points,
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

export const normalizeTodoSession = (
  value: Partial<TodoSession> | null | undefined,
  fallbackDate = getTodoTimestamp()
): TodoSession => ({
  todos: normalizeTodoItems(value?.todos, fallbackDate),
  earnedPoints: typeof value?.earnedPoints === 'number' ? value.earnedPoints : 0,
  archivedPointHistory: normalizePointHistory(value?.archivedPointHistory, fallbackDate),
  pendingPointHistory: normalizePointHistory(value?.pendingPointHistory, fallbackDate),
  hiddenPointHistoryIds: normalizeHistoryIds(value?.hiddenPointHistoryIds),
})

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

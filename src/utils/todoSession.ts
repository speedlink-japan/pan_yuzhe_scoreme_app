export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Step {
  id: string
  text: string
  completed: boolean
  createdAt: string
  completedAt?: string
}

export interface Milestone {
  id: string
  name: string
  steps: Step[]
  completed: boolean
  completedAt?: string
}

export interface Project {
  id: string
  name: string
  milestones: Milestone[]
  completed: boolean
  createdAt: string
  completedAt?: string
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

const normalizeCompletedDate = (
  completed: boolean,
  value: unknown,
  fallback: string
): string | undefined => {
  if (!completed) return undefined
  return normalizeDate(value, fallback)
}

const normalizeStep = (value: Partial<Step>, fallbackDate: string): Step => {
  const completed = Boolean(value.completed)

  return {
    id: typeof value.id === 'string' ? value.id : `step-${fallbackDate}`,
    text: typeof value.text === 'string' ? value.text : '',
    completed,
    createdAt: normalizeDate(value.createdAt, fallbackDate),
    completedAt: normalizeCompletedDate(completed, value.completedAt, fallbackDate),
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
    typeof value.points !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    type: value.type,
    points: value.points,
    completedAt: normalizeDate(value.completedAt, fallbackDate),
  }
}

const normalizePointHistory = (
  value: Partial<TodoPointHistoryItem>[] | undefined,
  fallbackDate: string
): TodoPointHistoryItem[] => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => normalizePointHistoryItem(item, fallbackDate))
    .filter((item): item is TodoPointHistoryItem => item !== null)
}

export const normalizeTodoSession = (
  value: Partial<TodoSession> | null | undefined,
  fallbackDate = getTodoTimestamp()
): TodoSession => ({
  todos: normalizeTodoItems(value?.todos, fallbackDate),
  earnedPoints: typeof value?.earnedPoints === 'number' ? value.earnedPoints : 0,
  archivedPointHistory: normalizePointHistory(value?.archivedPointHistory, fallbackDate),
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
        ensureDailyStats(statsByDate, getTodoDateKey(task.createdAt)).incompleteSingleTasks += 1
      }

      return statsByDate
    }

    const project = todo.data as Project
    project.milestones.forEach(milestone => {
      milestone.steps.forEach(step => {
        if (step.completed && step.completedAt) {
          ensureDailyStats(statsByDate, getTodoDateKey(step.completedAt)).completedProjectSteps += 1
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
  archivedPointHistory: TodoPointHistoryItem[] = []
): TodoPointHistoryItem[] => {
  const history = getTodoPointHistory(todos).filter(item => getTodoDateKey(item.completedAt) === date)
  const archivedHistory = archivedPointHistory.filter(
    item => getTodoDateKey(item.completedAt) === date
  )

  return mergeTodoPointHistory(archivedHistory, history).sort((a, b) => {
    const aTime = new Date(a.completedAt).getTime()
    const bTime = new Date(b.completedAt).getTime()
    return aTime - bTime
  })
}

export const getTodoPointHistory = (todos: TodoItem[]): TodoPointHistoryItem[] => {
  return todos.reduce<TodoPointHistoryItem[]>((items, todo) => {
    if (todo.type === 'single') {
      const task = todo.data as SingleTask

      if (task.completed && task.completedAt) {
        items.push({
          id: `single-${task.id}`,
          title: task.text,
          type: 'single',
          points: TODO_DIFFICULTY_POINTS[task.difficulty],
          completedAt: task.completedAt,
        })
      }

      return items
    }

    const project = todo.data as Project

    project.milestones.forEach(milestone => {
      milestone.steps.forEach(step => {
        if (step.completed && step.completedAt) {
          items.push({
            id: `step-${project.id}-${milestone.id}-${step.id}`,
            title: `${project.name} / ${step.text}`,
            type: 'project-step',
            points: TODO_STEP_POINTS,
            completedAt: step.completedAt,
          })
        }
      })

      const milestoneCompletedAt =
        milestone.completedAt ||
        getLatestCompletedAt(
          milestone.steps
            .filter(step => step.completed && step.completedAt)
            .map(step => step.completedAt as string)
        )

      if (
        milestone.completed &&
        milestoneCompletedAt
      ) {
        items.push({
          id: `milestone-${project.id}-${milestone.id}`,
          title: `${project.name} / ${milestone.name}`,
          type: 'milestone',
          points: TODO_MILESTONE_POINTS,
          completedAt: milestoneCompletedAt,
        })
      }
    })

    if (project.completed && project.completedAt) {
      items.push({
        id: `project-${project.id}`,
        title: project.name,
        type: 'project',
        points: TODO_PROJECT_POINTS,
        completedAt: project.completedAt,
      })
    }

    return items
  }, [])
}

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

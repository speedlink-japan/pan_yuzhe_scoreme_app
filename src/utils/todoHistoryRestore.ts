import {
  Project,
  TodoItem,
  TodoPointHistoryItem,
  getTodoMilestonePoints,
  getTodoProjectPoints,
  getTodoStepPoints,
  getTodoTimestamp,
} from './todoSession'

type IdFactory = (prefix: string) => string

const defaultIdFactory: IdFactory = prefix =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const getHistoryProjectId = (item: TodoPointHistoryItem): string | null =>
  item.sourceTodo?.type === 'project' ? item.sourceTodo.data.id : null

const mergeHistoryProjectSources = (
  projectId: string,
  history: TodoPointHistoryItem[]
): Project | null => {
  const sources = history
    .map(item => item.sourceTodo)
    .filter(
      (todo): todo is TodoItem =>
        todo?.type === 'project' && todo.data.id === projectId
    )
    .map(todo => todo.data as Project)

  if (sources.length === 0) return null

  const milestoneMap = new Map<string, Project['milestones'][number]>()
  sources.forEach(project => {
    project.milestones.forEach(milestone => {
      const current = milestoneMap.get(milestone.id)
      const stepMap = new Map((current?.steps || []).map(step => [step.id, step]))
      milestone.steps.forEach(step => stepMap.set(step.id, step))
      milestoneMap.set(milestone.id, {
        ...(current || milestone),
        ...milestone,
        steps: Array.from(stepMap.values()),
      })
    })
  })

  return {
    ...sources[0],
    ...sources[sources.length - 1],
    milestones: Array.from(milestoneMap.values()),
  }
}

const inferLegacyDifficulty = (points: number) => {
  if (points <= 10) return 'easy' as const
  if (points >= 50) return 'hard' as const
  return 'medium' as const
}

export const cloneTodoFromHistory = (
  item: TodoPointHistoryItem,
  history: TodoPointHistoryItem[],
  options: { createdAt?: string; idFactory?: IdFactory } = {}
): TodoItem | null => {
  const sourceTodo = item.sourceTodo
  const createdAt = options.createdAt || getTodoTimestamp()
  const createId = options.idFactory || defaultIdFactory

  if (!sourceTodo) {
    if (item.type !== 'single') return null

    return {
      type: 'single',
      data: {
        id: createId('task-copy'),
        text: item.title,
        difficulty: inferLegacyDifficulty(item.points),
        completed: false,
        createdAt,
      },
    }
  }

  if (sourceTodo.type === 'single') {
    return {
      type: 'single',
      data: {
        ...sourceTodo.data,
        id: createId('task-copy'),
        completed: false,
        createdAt,
        completedAt: undefined,
      },
    }
  }

  const sourceProjectId = sourceTodo.data.id
  const sourceProject =
    mergeHistoryProjectSources(sourceProjectId, [item, ...history]) ||
    (sourceTodo.data as Project)
  let sourceMilestones = sourceProject.milestones

  if (item.type === 'project-step' && item.sourceMilestoneId && item.sourceStepId) {
    sourceMilestones = sourceMilestones
      .filter(milestone => milestone.id === item.sourceMilestoneId)
      .map(milestone => ({
        ...milestone,
        steps: milestone.steps.filter(step => step.id === item.sourceStepId),
      }))
  } else if (item.type === 'milestone' && item.sourceMilestoneId) {
    sourceMilestones = sourceMilestones.filter(
      milestone => milestone.id === item.sourceMilestoneId
    )
  }

  if (sourceMilestones.length === 0) return null

  return {
    type: 'project',
    data: {
      ...sourceProject,
      id: createId('project-copy'),
      completed: false,
      createdAt,
      completedAt: undefined,
      bonusPoints: item.type === 'project' ? getTodoProjectPoints(sourceProject) : 0,
      milestones: sourceMilestones.map(milestone => ({
        ...milestone,
        id: createId('milestone-copy'),
        completed: false,
        completedAt: undefined,
        bonusPoints:
          item.type === 'project-step' ? 0 : getTodoMilestonePoints(milestone),
        steps: milestone.steps.map(step => ({
          ...step,
          id: createId('step-copy'),
          completed: false,
          createdAt,
          completedAt: undefined,
          rewardPoints: getTodoStepPoints(step),
        })),
      })),
    },
  }
}

export const getRedoHistoryItems = (
  item: TodoPointHistoryItem,
  history: TodoPointHistoryItem[]
): TodoPointHistoryItem[] => {
  if (item.type === 'single' || item.type === 'project-step') {
    return history.filter(historyItem => historyItem.id === item.id)
  }

  const projectId = getHistoryProjectId(item)
  if (!projectId) return history.filter(historyItem => historyItem.id === item.id)

  if (item.type === 'milestone') {
    return history.filter(historyItem =>
      getHistoryProjectId(historyItem) === projectId &&
      historyItem.sourceMilestoneId === item.sourceMilestoneId &&
      (historyItem.type === 'project-step' || historyItem.type === 'milestone')
    )
  }

  return history.filter(historyItem => getHistoryProjectId(historyItem) === projectId)
}

export const createTodoHistoryRedoPlan = (
  item: TodoPointHistoryItem,
  history: TodoPointHistoryItem[],
  options: { createdAt?: string; idFactory?: IdFactory } = {}
) => {
  const todo = cloneTodoFromHistory(item, history, options)
  if (!todo) return null

  const relatedHistory = getRedoHistoryItems(item, history)
  return {
    todo,
    historyIds: relatedHistory.map(historyItem => historyItem.id),
    points: relatedHistory.reduce((total, historyItem) => total + historyItem.points, 0),
  }
}

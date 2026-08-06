'use client'

import React, { useRef, useState } from 'react'
import styles from './TodoPanel.module.css'
import {
  Difficulty,
  PointAccount,
  Project,
  SingleTask,
  TodoItem,
  TodoSession,
  TaskCategory,
  TaskPreset,
  TODO_SESSION_STORAGE_KEY,
  createDemoTodoSession,
  createSingleTaskFromPreset,
  finalizeTodoDelivery,
  getTodoPointHistory,
  getTodoMilestonePoints,
  getTodoPendingPoints,
  getTodoStepPoints,
  getTodoTimestamp,
  mergeTodoPointHistory,
  normalizeTodoSession,
  resolveTodoReward,
  TodoPointHistoryItem,
} from '@/utils/todoSession'
import {
  clearTodoSessionPendingSync,
  getLocalTodoSessionUpdatedAt,
  hasTodoSessionPendingSync,
  isRemoteTodoSessionNewer,
  isTodoSupabaseSyncConfigured,
  loadRemoteTodoSession,
  markTodoSessionPendingSync,
  persistTodoSession,
  saveRemoteTodoSession,
} from '@/utils/todoSupabaseSync'

type StepDraft = { id: string; text: string }
type DraggedProjectFormItem =
  | { type: 'milestone'; milestoneId: string }
  | { type: 'step'; milestoneId: string | null; stepId: string }
  | { type: 'stepGroup'; milestoneId: string }
type StepDropTarget = { milestoneId: string | null; stepId?: string }
const loadTodoSession = () => {
  if (typeof window === 'undefined') {
    return normalizeTodoSession(null)
  }

  try {
    const rawSession = window.localStorage.getItem(TODO_SESSION_STORAGE_KEY)
    if (!rawSession) return normalizeTodoSession(null)

    return normalizeTodoSession(JSON.parse(rawSession))
  } catch {
    return normalizeTodoSession(null)
  }
}

// ポイント計算関数
const getDifficultyEmoji = (difficulty: Difficulty): string => {
  const emojiMap = {
    easy: '⭐️',
    medium: '⭐️⭐️',
    hard: '⭐️⭐️⭐️',
  }
  return emojiMap[difficulty]
}

const calculatePoints = (
  item: TodoItem,
  categories: TaskCategory[],
  pointRules: TodoSession['pointRules']
): number => {
  if (item.type === 'single') {
    return resolveTodoReward(item, categories, pointRules).points
  } else {
    // プロジェクトポイント計算
    const project = item.data as Project
    let points = resolveTodoReward(item, categories, pointRules).points
    let completedSteps = 0
    let totalSteps = 0

    project.milestones.forEach(milestone => {
      points += getTodoMilestonePoints(milestone)
      milestone.steps.forEach(step => {
        totalSteps++
        if (step.completed) completedSteps++
        points += getTodoStepPoints(step)
      })
    })

    return points
  }
}

interface TodoPanelProps {
  onPointsChange?: (points: number) => void
}

const TodoPanel: React.FC<TodoPanelProps> = ({ onPointsChange }) => {
  const initialTodoSession = useRef(loadTodoSession())
  const skipNextSaveRef = useRef(true)
  const [todos, setTodos] = useState<TodoItem[]>(initialTodoSession.current.todos)

  const [newTodoText, setNewTodoText] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium')
  const [activeTab, setActiveTab] = useState<'tasks' | 'create'>('tasks')
  const [earnedPoints, setEarnedPoints] = useState(initialTodoSession.current.earnedPoints)
  const [archivedPointHistory, setArchivedPointHistory] = useState<TodoPointHistoryItem[]>(
    initialTodoSession.current.archivedPointHistory
  )
  const [pendingPointHistory, setPendingPointHistory] = useState<TodoPointHistoryItem[]>(
    initialTodoSession.current.pendingPointHistory
  )
  const [hiddenPointHistoryIds, setHiddenPointHistoryIds] = useState<string[]>(
    initialTodoSession.current.hiddenPointHistoryIds
  )
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false)
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>(initialTodoSession.current.taskCategories)
  const [taskPresets, setTaskPresets] = useState<TaskPreset[]>(initialTodoSession.current.taskPresets)
  const [pointRules, setPointRules] = useState(initialTodoSession.current.pointRules)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<'' | PointAccount>('')
  const [pointOverride, setPointOverride] = useState('')
  const [projectCategoryId, setProjectCategoryId] = useState('')
  const [projectAccount, setProjectAccount] = useState<'' | PointAccount>('')
  const [projectPointOverride, setProjectPointOverride] = useState('')
  
  // プロジェクト作成フォーム用
  interface ProjectFormMilestone {
    id: string
    name: string
    steps: StepDraft[]
    newStepText: string
  }
  
  const [projectFormData, setProjectFormData] = useState<{
    name: string
    unassignedSteps: StepDraft[]
    newStepText: string
    milestones: ProjectFormMilestone[]
    newMilestoneName: string
  }>({
    name: '',
    unassignedSteps: [],
    newStepText: '',
    milestones: [],
    newMilestoneName: '',
  })
  const [draggedProjectFormItem, setDraggedProjectFormItem] = useState<DraggedProjectFormItem | null>(null)
  const [movedMilestoneId, setMovedMilestoneId] = useState<string | null>(null)
  const [hoveredMilestoneId, setHoveredMilestoneId] = useState<string | null>(null)
  const [movedStepId, setMovedStepId] = useState<string | null>(null)
  const [movedStepGroupId, setMovedStepGroupId] = useState<string | null>(null)
  const [hoveredStepTarget, setHoveredStepTarget] = useState<StepDropTarget | null>(null)

  // ポイント変更を親に通知
  React.useEffect(() => {
    onPointsChange?.(earnedPoints)
  }, [earnedPoints, onPointsChange])

  React.useEffect(() => {
    const todoSession = {
      ...loadTodoSession(),
      todos,
      earnedPoints,
      archivedPointHistory,
      pendingPointHistory,
      hiddenPointHistoryIds,
      taskCategories,
      taskPresets,
      pointRules,
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      window.dispatchEvent(new CustomEvent('todo-session-updated', { detail: todoSession }))
      return
    }

    const updatedAt = getTodoTimestamp()
    window.dispatchEvent(new CustomEvent('todo-session-updated', { detail: todoSession }))
    try {
      void persistTodoSession(todoSession, updatedAt).catch(() => undefined)
    } catch {
      markTodoSessionPendingSync()
    }
  }, [todos, earnedPoints, archivedPointHistory, pendingPointHistory, hiddenPointHistoryIds, taskCategories, taskPresets, pointRules])

  React.useEffect(() => {
    if (!isTodoSupabaseSyncConfigured()) return

    let isActive = true

    const syncFromRemote = async () => {
      try {
        const remoteSession = await loadRemoteTodoSession()
        if (!isActive) return

        const localUpdatedAt = getLocalTodoSessionUpdatedAt()

        if (
          remoteSession &&
          !hasTodoSessionPendingSync() &&
          isRemoteTodoSessionNewer(remoteSession.updatedAt, localUpdatedAt)
        ) {
          skipNextSaveRef.current = true
          setTodos(remoteSession.session.todos)
          setEarnedPoints(remoteSession.session.earnedPoints)
          setArchivedPointHistory(remoteSession.session.archivedPointHistory)
          setPendingPointHistory(remoteSession.session.pendingPointHistory)
          setHiddenPointHistoryIds(remoteSession.session.hiddenPointHistoryIds)
          setTaskCategories(remoteSession.session.taskCategories)
          setTaskPresets(remoteSession.session.taskPresets)
          setPointRules(remoteSession.session.pointRules)
          window.dispatchEvent(
            new CustomEvent('todo-session-updated', { detail: remoteSession.session })
          )
          persistTodoSession(remoteSession.session, remoteSession.updatedAt).catch(() => undefined)
          return
        }

        const localIsNewer = Boolean(
          remoteSession &&
          localUpdatedAt &&
          isRemoteTodoSessionNewer(localUpdatedAt, remoteSession.updatedAt)
        )
        const shouldPushLocalSession =
          !remoteSession || hasTodoSessionPendingSync() || localIsNewer

        if (shouldPushLocalSession) {
          const todoSession = initialTodoSession.current
          const updatedAt = localUpdatedAt || getTodoTimestamp()
          await saveRemoteTodoSession(todoSession, updatedAt)
          if (isActive) {
            clearTodoSessionPendingSync()
          }
        }
      } catch {
        markTodoSessionPendingSync()
      }
    }

    syncFromRemote()

    return () => {
      isActive = false
    }
  }, [])

  React.useEffect(() => {
    const handleExternalTodoSessionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<TodoSession>>
      const nextSession = normalizeTodoSession(customEvent.detail)
      skipNextSaveRef.current = true
      setTodos(nextSession.todos)
      setEarnedPoints(nextSession.earnedPoints)
      setArchivedPointHistory(nextSession.archivedPointHistory)
      setPendingPointHistory(nextSession.pendingPointHistory)
      setHiddenPointHistoryIds(nextSession.hiddenPointHistoryIds)
      setTaskCategories(nextSession.taskCategories)
      setTaskPresets(nextSession.taskPresets)
      setPointRules(nextSession.pointRules)
    }

    window.addEventListener('todo-session-external-update', handleExternalTodoSessionUpdate)

    return () => {
      window.removeEventListener('todo-session-external-update', handleExternalTodoSessionUpdate)
    }
  }, [])

  React.useEffect(() => {
    if (!movedMilestoneId) return

    const timer = window.setTimeout(() => {
      setMovedMilestoneId(null)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [movedMilestoneId])

  React.useEffect(() => {
    if (!movedStepId) return

    const timer = window.setTimeout(() => {
      setMovedStepId(null)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [movedStepId])

  React.useEffect(() => {
    if (!movedStepGroupId) return

    const timer = window.setTimeout(() => {
      setMovedStepGroupId(null)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [movedStepGroupId])

  const addSingleTask = () => {
    if (newTodoText.trim()) {
      const createdAt = getTodoTimestamp()

      setTodos([
        ...todos,
        {
          type: 'single',
          data: {
            id: crypto.randomUUID(),
            text: newTodoText,
            difficulty: selectedDifficulty,
            completed: false,
            createdAt,
            categoryId: selectedCategoryId || undefined,
            pointAccount: selectedAccount || undefined,
            pointOverride: pointOverride === '' ? undefined : Math.max(0, Math.trunc(Number(pointOverride))),
          },
        },
      ])
      setNewTodoText('')
      setSelectedDifficulty('medium')
      setSelectedCategoryId('')
      setSelectedAccount('')
      setPointOverride('')
    }
  }

  const addProject = () => {
    const hasSteps =
      projectFormData.unassignedSteps.length > 0 ||
      projectFormData.milestones.some(m => m.steps.length > 0)

    if (projectFormData.name.trim() && hasSteps) {
      const createdAt = getTodoTimestamp()
      const unassignedMilestone =
        projectFormData.unassignedSteps.length > 0
          ? [
              {
                id: `m-unassigned-${Date.now()}`,
                name: '未分類',
                steps: projectFormData.unassignedSteps.map(s => ({
                  id: s.id,
                  text: s.text,
                  completed: false,
                  createdAt,
                })),
                completed: false,
              },
            ]
          : []

      const milestones = projectFormData.milestones.map(m => ({
        id: m.id,
        name: m.name,
        steps: m.steps.map(s => ({
          id: s.id,
          text: s.text,
          completed: false,
          createdAt,
        })),
        completed: false,
      }))

      setTodos([
        ...todos,
        {
          type: 'project',
          data: {
            id: crypto.randomUUID(),
            name: projectFormData.name,
            milestones: [...unassignedMilestone, ...milestones],
            completed: false,
            createdAt,
            categoryId: projectCategoryId || undefined,
            pointAccount: projectAccount || undefined,
            pointOverride:
              projectPointOverride === ''
                ? undefined
                : Math.max(0, Math.trunc(Number(projectPointOverride))),
          },
        },
      ])
      
      // フォームをリセット
      setProjectFormData({
        name: '',
        unassignedSteps: [],
        newStepText: '',
        milestones: [],
        newMilestoneName: '',
      })
      setActiveTab('tasks')
      setProjectCategoryId('')
      setProjectAccount('')
      setProjectPointOverride('')
    }
  }

  const addFromPreset = (preset: TaskPreset) => {
    setTodos(current => [
      ...current,
      createSingleTaskFromPreset(preset, getTodoTimestamp(), crypto.randomUUID()),
    ])
    setActiveTab('tasks')
  }

  const savePreset = () => {
    if (!newTodoText.trim()) return
    const nextPreset: TaskPreset = {
      id: crypto.randomUUID(),
      title: newTodoText.trim(),
      difficulty: selectedDifficulty,
      categoryId: selectedCategoryId || undefined,
      account: selectedAccount || undefined,
      points: pointOverride === '' ? undefined : Math.max(0, Math.trunc(Number(pointOverride))),
    }
    setTaskPresets(current => [...current, nextPreset])
  }

  const addUnassignedStepToForm = () => {
    if (projectFormData.newStepText.trim()) {
      setProjectFormData(prev => ({
        ...prev,
        unassignedSteps: [
          ...prev.unassignedSteps,
          { id: `s-${Date.now()}`, text: prev.newStepText },
        ],
        newStepText: '',
      }))
    }
  }

  const addMilestoneToForm = () => {
    if (projectFormData.newMilestoneName.trim()) {
      setProjectFormData(prev => ({
        ...prev,
        milestones: [
          ...prev.milestones,
          {
            id: `m-${Date.now()}`,
            name: prev.newMilestoneName,
            steps: [],
            newStepText: '',
          },
        ],
        newMilestoneName: '',
      }))
    }
  }

  const addStepToMilestone = (milestoneId: string) => {
    setProjectFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => {
        if (m.id === milestoneId && m.newStepText.trim()) {
          return {
            ...m,
            steps: [...m.steps, { id: `s-${Date.now()}`, text: m.newStepText }],
            newStepText: '',
          }
        }
        return m
      }),
    }))
  }

  const removeStepFromMilestone = (milestoneId: string, stepId: string) => {
    setProjectFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === milestoneId
          ? { ...m, steps: m.steps.filter(s => s.id !== stepId) }
          : m
      ),
    }))
  }

  const removeUnassignedStep = (stepId: string) => {
    setProjectFormData(prev => ({
      ...prev,
      unassignedSteps: prev.unassignedSteps.filter(s => s.id !== stepId),
    }))
  }

  const removeMilestoneFromForm = (milestoneId: string) => {
    setProjectFormData(prev => ({
      ...prev,
      unassignedSteps: [
        ...prev.unassignedSteps,
        ...(prev.milestones.find(m => m.id === milestoneId)?.steps || []),
      ],
      milestones: prev.milestones.filter(m => m.id !== milestoneId),
    }))
  }

  const updateMilestoneName = (milestoneId: string, newName: string) => {
    setProjectFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === milestoneId ? { ...m, name: newName } : m
      ),
    }))
  }

  const updateUnassignedStep = (stepId: string, newText: string) => {
    setProjectFormData(prev => ({
      ...prev,
      unassignedSteps: prev.unassignedSteps.map(s =>
        s.id === stepId ? { ...s, text: newText } : s
      ),
    }))
  }

  const updateMilestoneStep = (milestoneId: string, stepId: string, newText: string) => {
    setProjectFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === milestoneId
          ? {
              ...m,
              steps: m.steps.map(s => (s.id === stepId ? { ...s, text: newText } : s)),
            }
          : m
      ),
    }))
  }

  const moveMilestoneInForm = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return

    setProjectFormData(prev => {
      const sourceIndex = prev.milestones.findIndex(m => m.id === sourceId)
      const targetIndex = prev.milestones.findIndex(m => m.id === targetId)
      if (sourceIndex === -1 || targetIndex === -1) return prev

      const milestones = [...prev.milestones]
      const [moved] = milestones.splice(sourceIndex, 1)
      milestones.splice(targetIndex, 0, moved)
      setMovedMilestoneId(sourceId)
      return { ...prev, milestones }
    })
  }

  const moveMilestoneStepsInForm = (sourceMilestoneId: string, targetMilestoneId: string | null) => {
    setProjectFormData(prev => {
      const sourceMilestone = prev.milestones.find(m => m.id === sourceMilestoneId)
      if (!sourceMilestone || sourceMilestone.steps.length === 0) return prev

      if (targetMilestoneId === null) {
        return {
          ...prev,
          unassignedSteps: [...prev.unassignedSteps, ...sourceMilestone.steps],
          milestones: prev.milestones.map(m =>
            m.id === sourceMilestoneId ? { ...m, steps: [] } : m
          ),
        }
      }

      if (sourceMilestoneId === targetMilestoneId) return prev

      return {
        ...prev,
        milestones: prev.milestones.map(m => {
          if (m.id === sourceMilestoneId) {
            return { ...m, steps: [] }
          }
          if (m.id === targetMilestoneId) {
            return { ...m, steps: [...m.steps, ...sourceMilestone.steps] }
          }
          return m
        }),
      }
    })
  }

  const moveStepInProjectForm = (
    sourceMilestoneId: string | null,
    stepId: string,
    targetMilestoneId: string | null,
    targetStepId?: string
  ) => {
    setProjectFormData(prev => {
      const sourceSteps =
        sourceMilestoneId === null
          ? prev.unassignedSteps
          : prev.milestones.find(m => m.id === sourceMilestoneId)?.steps || []
      const movedStep = sourceSteps.find(s => s.id === stepId)
      if (!movedStep) return prev

      const removeFrom = (steps: StepDraft[]) => steps.filter(s => s.id !== stepId)
      const insertInto = (steps: StepDraft[]) => {
        const withoutMoved = removeFrom(steps)
        const targetIndex = targetStepId
          ? withoutMoved.findIndex(s => s.id === targetStepId)
          : withoutMoved.length
        const insertIndex = targetIndex === -1 ? withoutMoved.length : targetIndex
        return [
          ...withoutMoved.slice(0, insertIndex),
          movedStep,
          ...withoutMoved.slice(insertIndex),
        ]
      }

      return {
        ...prev,
        unassignedSteps:
          targetMilestoneId === null
            ? insertInto(sourceMilestoneId === null ? removeFrom(prev.unassignedSteps) : prev.unassignedSteps)
            : sourceMilestoneId === null
              ? removeFrom(prev.unassignedSteps)
              : prev.unassignedSteps,
        milestones: prev.milestones.map(m => {
          if (m.id === targetMilestoneId) {
            const baseSteps = sourceMilestoneId === m.id ? removeFrom(m.steps) : m.steps
            return { ...m, steps: insertInto(baseSteps) }
          }
          if (m.id === sourceMilestoneId) {
            return { ...m, steps: removeFrom(m.steps) }
          }
          return m
        }),
      }
    })
  }

  const handleProjectFormDrop = (targetMilestoneId: string | null, targetStepId?: string) => {
    if (!draggedProjectFormItem) return

    if (draggedProjectFormItem.type === 'step') {
      moveStepInProjectForm(
        draggedProjectFormItem.milestoneId,
        draggedProjectFormItem.stepId,
        targetMilestoneId,
        targetStepId
      )
      if (
        draggedProjectFormItem.milestoneId !== targetMilestoneId ||
        draggedProjectFormItem.stepId !== targetStepId
      ) {
        setMovedStepId(draggedProjectFormItem.stepId)
      }
    } else if (draggedProjectFormItem.type === 'stepGroup') {
      moveMilestoneStepsInForm(draggedProjectFormItem.milestoneId, targetMilestoneId)
      if (draggedProjectFormItem.milestoneId !== targetMilestoneId) {
        setMovedStepGroupId(targetMilestoneId ?? 'unassigned')
      }
    }
    setHoveredMilestoneId(null)
    setHoveredStepTarget(null)
    setDraggedProjectFormItem(null)
  }

  const isHoveredStepTarget = (milestoneId: string | null, stepId?: string) =>
    draggedProjectFormItem?.type === 'step' &&
    hoveredStepTarget?.milestoneId === milestoneId &&
    hoveredStepTarget?.stepId === stepId &&
    draggedProjectFormItem.stepId !== stepId

  const isDraggingStepGroupFrom = (milestoneId: string) =>
    draggedProjectFormItem?.type === 'stepGroup' && draggedProjectFormItem.milestoneId === milestoneId

  const toggleSingleTask = (id: string) => {
    const completedAt = getTodoTimestamp()
    let nextPendingPointHistory = pendingPointHistory

    const newTodos = todos.map(todo => {
      if (todo.type === 'single' && todo.data.id === id) {
        const task = todo.data as SingleTask
        const isNowCompleted = !task.completed
        const historyId = `single-${task.id}`
        const wasPending = pendingPointHistory.some(item => item.id === historyId)

        if (isNowCompleted && !task.completedAt) {
          const reward = resolveTodoReward(todo, taskCategories, pointRules)
          const pendingItem: TodoPointHistoryItem = {
            id: historyId,
            title: task.text,
            type: 'single',
            points: reward.points,
            account: reward.account,
            sourceId: `todo:${historyId}`,
            completedAt,
            sourceTodo: todo,
          }
          if (!nextPendingPointHistory.some(item => item.id === historyId)) {
            nextPendingPointHistory = [...nextPendingPointHistory, pendingItem]
          }
        } else if (!isNowCompleted) {
          nextPendingPointHistory = nextPendingPointHistory.filter(item => item.id !== historyId)
        }

        return {
          ...todo,
          data: {
            ...task,
            completed: isNowCompleted,
            completedAt: isNowCompleted
              ? (task.completedAt || completedAt)
              : (wasPending ? undefined : task.completedAt),
          },
        }
      }
      return todo
    })

    setTodos(newTodos)
    setPendingPointHistory(nextPendingPointHistory)
  }

  const toggleProjectStep = (projectId: string, milestoneId: string, stepId: string) => {
    const completedAt = getTodoTimestamp()
    let nextPendingPointHistory = pendingPointHistory

    const newTodos = todos.map(todo => {
      if (todo.type === 'project' && todo.data.id === projectId) {
        const project = todo.data as Project
        
        // 更新前の状態を取得
        const oldMilestoneCompleted = project.milestones.find(m => m.id === milestoneId)?.completed || false
        const oldMilestoneCompletedAt = project.milestones.find(m => m.id === milestoneId)?.completedAt
        const oldProjectCompleted = project.completed
        const oldProjectCompletedAt = project.completedAt
        const oldStepCompletedAt = project.milestones
          .find(m => m.id === milestoneId)
          ?.steps.find(s => s.id === stepId)?.completedAt
        const stepHistoryId = `step-${project.id}-${milestoneId}-${stepId}`
        const milestoneHistoryId = `milestone-${project.id}-${milestoneId}`
        const projectHistoryId = `project-${project.id}`
        const wasStepPending = pendingPointHistory.some(item => item.id === stepHistoryId)
        const wasMilestonePending = pendingPointHistory.some(item => item.id === milestoneHistoryId)
        const wasProjectPending = pendingPointHistory.some(item => item.id === projectHistoryId)
        
        // ステップのトグル
        const newMilestones = project.milestones.map(m =>
          m.id === milestoneId
            ? {
                ...m,
                steps: m.steps.map(s =>
                  s.id === stepId
                    ? {
                        ...s,
                        completed: !s.completed,
                        completedAt: !s.completed
                          ? (s.completedAt || completedAt)
                          : (wasStepPending ? undefined : s.completedAt),
                      }
                    : s
                ),
                completed: m.steps.every(s => s.id === stepId ? !s.completed : s.completed),
                completedAt: m.steps.every(s => s.id === stepId ? !s.completed : s.completed)
                  ? m.completedAt || completedAt
                  : (wasMilestonePending ? undefined : m.completedAt),
              }
            : m
        )
        
        // 新しいプロジェクト完了状態
        const newProjectCompleted = newMilestones.every(m => m.completed)
        
        // 更新後のマイルストーン完了状態
        const newMilestoneCompleted = newMilestones.find(m => m.id === milestoneId)?.completed || false
        
        // ポイント計算
        const isStepNowCompleted = newMilestones
          .find(m => m.id === milestoneId)
          ?.steps.find(s => s.id === stepId)?.completed

        if (isStepNowCompleted && !oldStepCompletedAt) {
          const step = newMilestones
            .find(m => m.id === milestoneId)
            ?.steps.find(s => s.id === stepId)
          if (step && !nextPendingPointHistory.some(item => item.id === stepHistoryId)) {
            const reward = resolveTodoReward(todo, taskCategories, pointRules, getTodoStepPoints(step))
            nextPendingPointHistory = [
              ...nextPendingPointHistory,
              {
                id: stepHistoryId,
                title: `${project.name} / ${step.text}`,
                type: 'project-step',
                points: getTodoStepPoints(step),
                account: reward.account,
                sourceId: `todo:${stepHistoryId}`,
                completedAt,
                sourceTodo: todo,
                sourceMilestoneId: milestoneId,
                sourceStepId: stepId,
              },
            ]
          }
        } else if (!isStepNowCompleted) {
          nextPendingPointHistory = nextPendingPointHistory.filter(
            item => item.id !== stepHistoryId
          )
        }

        if (!oldMilestoneCompleted && newMilestoneCompleted && !oldMilestoneCompletedAt) {
          const reward = resolveTodoReward(
            todo,
            taskCategories,
            pointRules,
            getTodoMilestonePoints(newMilestones.find(milestone => milestone.id === milestoneId)!)
          )
          if (!nextPendingPointHistory.some(item => item.id === milestoneHistoryId)) {
            const milestone = newMilestones.find(item => item.id === milestoneId)!
            nextPendingPointHistory = [...nextPendingPointHistory, {
              id: milestoneHistoryId,
              title: `${project.name} / ${milestone.name}`,
              type: 'milestone',
              points: getTodoMilestonePoints(milestone),
              account: reward.account,
              sourceId: `todo:${milestoneHistoryId}`,
              completedAt,
              sourceTodo: todo,
              sourceMilestoneId: milestoneId,
            }]
          }
        } else if (!newMilestoneCompleted) {
          nextPendingPointHistory = nextPendingPointHistory.filter(
            item => item.id !== milestoneHistoryId
          )
        }

        if (!oldProjectCompleted && newProjectCompleted && !oldProjectCompletedAt) {
          const reward = resolveTodoReward(todo, taskCategories, pointRules)
          if (!nextPendingPointHistory.some(item => item.id === projectHistoryId)) {
            nextPendingPointHistory = [...nextPendingPointHistory, {
              id: projectHistoryId,
              title: project.name,
              type: 'project',
              points: reward.points,
              account: reward.account,
              sourceId: `todo:${projectHistoryId}`,
              completedAt,
              sourceTodo: todo,
            }]
          }
        } else if (!newProjectCompleted) {
          nextPendingPointHistory = nextPendingPointHistory.filter(
            item => item.id !== projectHistoryId
          )
        }
        
        return {
          ...todo,
          data: {
            ...project,
            milestones: newMilestones,
            completed: newProjectCompleted,
            completedAt: newProjectCompleted
              ? (project.completedAt || completedAt)
              : (wasProjectPending ? undefined : project.completedAt),
          },
        }
      }
      return todo
    })
    
    setTodos(newTodos)
    setPendingPointHistory(nextPendingPointHistory)
  }

  const deleteTodo = (id: string) => {
    const removedTodos = todos.filter(todo => todo.data.id === id)
    const removedAllPointHistory = getTodoPointHistory(
      removedTodos,
      [],
      hiddenPointHistoryIds,
      taskCategories,
      pointRules
    )
    const removedPointHistory = getTodoPointHistory(
      removedTodos,
      pendingPointHistory,
      hiddenPointHistoryIds,
      taskCategories,
      pointRules
    )

    if (removedPointHistory.length > 0) {
      setArchivedPointHistory(prev => mergeTodoPointHistory(prev, removedPointHistory))
    }

    const removedHistoryIds = new Set(removedAllPointHistory.map(item => item.id))
    setPendingPointHistory(prev => prev.filter(item => !removedHistoryIds.has(item.id)))
    setTodos(todos.filter(todo => todo.data.id !== id))
  }

  const hasCompletedRecords = () => {
    return todos.some(todo => {
      if (todo.type === 'single') {
        return (todo.data as SingleTask).completed
      }

      const project = todo.data as Project
      return project.milestones.some(milestone =>
        milestone.steps.some(step => step.completed)
      )
    })
  }

  const clearCompletedRecords = () => {
    const pendingPoints = getTodoPendingPoints(pendingPointHistory)

    if (pendingPointHistory.length === 0 || !hasCompletedRecords()) {
      window.alert('納品予定PTがありません。チェック済みタスクを確認してから納品して。')
      return
    }

    if (
      typeof window !== 'undefined' &&
      window.confirm(`チェック済みタスクを納品して、${pendingPoints}ptを獲得ポイントに加算する？`)
    ) {
      const baseSession = loadTodoSession()
      const activeTodos = todos
        .map(todo => {
          if (todo.type === 'single') {
            const task = todo.data as SingleTask
            return task.completed ? null : todo
          }

          const project = todo.data as Project
          const milestones = project.milestones
            .map(milestone => {
              const activeSteps = milestone.steps.filter(step => !step.completed)
              return {
                ...milestone,
                steps: activeSteps,
                completed: activeSteps.length > 0 && activeSteps.every(step => step.completed),
              }
            })
            .filter(milestone => milestone.steps.length > 0)

          if (milestones.length === 0) return null

          return {
            ...todo,
            data: {
              ...project,
              milestones,
              completed: milestones.length > 0 && milestones.every(milestone => milestone.completed),
            },
          }
        })
        .filter((todo): todo is TodoItem => todo !== null)

      const sessionBeforeDelivery: TodoSession = {
        ...baseSession,
        todos,
        earnedPoints,
        archivedPointHistory,
        pendingPointHistory,
        hiddenPointHistoryIds,
        taskCategories,
        taskPresets,
        pointRules,
      }
      const nextSession = finalizeTodoDelivery(sessionBeforeDelivery, activeTodos)
      const updatedAt = getTodoTimestamp()

      try {
        void persistTodoSession(nextSession, updatedAt).catch(() => undefined)
      } catch {
        window.alert('保存に失敗したため、納品しなかった。')
        return
      }

      skipNextSaveRef.current = true
      setTodos(nextSession.todos)
      setArchivedPointHistory(nextSession.archivedPointHistory)
      setPendingPointHistory(nextSession.pendingPointHistory)
      setEarnedPoints(nextSession.earnedPoints)
      setActiveTab('tasks')
    }
  }

  const loadDemoTodos = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm('確認用のサンプルTODOに置き換えますか？現在のTODO内容は上書きされます。')
    ) {
      const demoSession = createDemoTodoSession()
      setTodos(demoSession.todos)
      setEarnedPoints(demoSession.earnedPoints)
      setArchivedPointHistory(demoSession.archivedPointHistory)
      setPendingPointHistory(demoSession.pendingPointHistory)
      setHiddenPointHistoryIds(demoSession.hiddenPointHistoryIds)
      setHideCompletedTasks(false)
      setActiveTab('tasks')
    }
  }

  const visibleTodos = hideCompletedTasks
    ? todos
        .map(todo => {
          if (todo.type === 'single') {
            const task = todo.data as SingleTask
            return task.completed ? null : todo
          }

          const project = todo.data as Project
          const visibleMilestones = project.milestones
            .map(milestone => ({
              ...milestone,
              steps: milestone.steps.filter(step => !step.completed),
            }))
            .filter(milestone => milestone.steps.length > 0)

          if (visibleMilestones.length === 0) return null

          return {
            ...todo,
            data: {
              ...project,
              milestones: visibleMilestones,
            },
          }
        })
        .filter((todo): todo is TodoItem => todo !== null)
    : todos

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>✓ TODO</h2>
        <span className={styles.pointsBadge}>納品予定 {getTodoPendingPoints(pendingPointHistory)}pt</span>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'tasks' ? styles.active : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          やること
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
          onClick={() => setActiveTab('create')}
        >
          新しく作る
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'tasks' ? (
          <div className={styles.todoList}>
            {visibleTodos.map(todo => (
              <div key={todo.data.id} className={styles.todoItem}>
                <div className={styles.todoContent}>
                  {todo.type === 'single' ? (
                    <>
                      <input
                        type="checkbox"
                        checked={(todo.data as SingleTask).completed}
                        onChange={() => toggleSingleTask(todo.data.id)}
                        className={styles.checkbox}
                      />
                      <span className={`${styles.text} ${(todo.data as SingleTask).completed ? styles.completed : ''}`}>
                        {(todo.data as SingleTask).text}
                      </span>
                      <span className={styles.difficulty}>
                        {getDifficultyEmoji((todo.data as SingleTask).difficulty)}
                      </span>
                    </>
                  ) : (
                    <div className={styles.projectContent}>
                      <h4>{(todo.data as Project).name}</h4>
                      {(todo.data as Project).milestones.map(milestone => (
                        <div key={milestone.id} className={styles.milestone}>
                          <span className={styles.milestoneName}>{milestone.name}</span>
                          <div className={styles.steps}>
                            {milestone.steps.map(step => (
                              <div key={step.id} className={styles.step}>
                                <input
                                  type="checkbox"
                                  checked={step.completed}
                                  onChange={() =>
                                    toggleProjectStep(todo.data.id, milestone.id, step.id)
                                  }
                                  className={styles.stepCheckbox}
                                />
                                <span className={`${styles.stepText} ${step.completed ? styles.completed : ''}`}>
                                  {step.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.pointsSection}>
                  <span className={styles.accountTag}>
                    {resolveTodoReward(todo, taskCategories, pointRules).account === 'effort' ? '頑張り' : '休憩'}
                  </span>
                  <span className={styles.points}>+{calculatePoints(todo, taskCategories, pointRules)}pt</span>
                  <button onClick={() => deleteTodo(todo.data.id)} className={styles.deleteBtn}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.createForm}>
            <div className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <h3>よく使うタスク</h3>
                <button type="button" className={styles.linkButton} onClick={() => window.dispatchEvent(new Event('open-point-management'))}>
                  カテゴリ・ルール管理
                </button>
              </div>
              {taskPresets.length === 0 ? (
                <p className={styles.sectionHelp}>タスク名を入力して「プリセット保存」すると、ここからワンタップ追加できる。</p>
              ) : (
                <div className={styles.presetList}>
                  {taskPresets.map(preset => (
                    <button key={preset.id} type="button" className={styles.presetButton} onClick={() => addFromPreset(preset)}>
                      ＋ {preset.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.formSection}>
              <h3>すぐ終わるタスク</h3>
              <p className={styles.sectionHelp}>1回のチェックで完了する小さな作業です。</p>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSingleTask()}
                  placeholder="タスク名を入力"
                  className={styles.input}
                />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as Difficulty)}
                  className={styles.select}
                >
                  <option value="easy">⭐️ (10pts)</option>
                  <option value="medium">⭐️⭐️ (25pts)</option>
                  <option value="hard">⭐️⭐️⭐️ (50pts)</option>
                </select>
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className={styles.select}>
                  <option value="">カテゴリなし</option>
                  {taskCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value as '' | PointAccount)} className={styles.select}>
                  <option value="">獲得先：ルールに従う</option>
                  <option value="effort">頑張り</option>
                  <option value="rest">休憩</option>
                </select>
                <input type="number" min="0" step="1" value={pointOverride} onChange={(e) => setPointOverride(e.target.value)} placeholder="ポイント：ルールに従う" className={styles.input} />
                <button onClick={addSingleTask} className={styles.submitBtn}>
                  追加
                </button>
                <button type="button" onClick={savePreset} className={styles.secondaryBtn}>プリセット保存</button>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>じっくり進めるタスク</h3>
              <p className={styles.sectionHelp}>長期タスクや工数の多い作業を、ステップに分けて進めます。</p>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  value={projectFormData.name}
                  onChange={(e) => setProjectFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="プロジェクト名を入力"
                  className={styles.input}
                />
                <select value={projectCategoryId} onChange={(e) => setProjectCategoryId(e.target.value)} className={styles.select}>
                  <option value="">カテゴリなし</option>
                  {taskCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <select value={projectAccount} onChange={(e) => setProjectAccount(e.target.value as '' | PointAccount)} className={styles.select}>
                  <option value="">獲得先：ルールに従う</option>
                  <option value="effort">頑張り</option>
                  <option value="rest">休憩</option>
                </select>
                <input type="number" min="0" step="1" value={projectPointOverride} onChange={(e) => setProjectPointOverride(e.target.value)} placeholder="プロジェクト達成ポイント：ルールに従う" className={styles.input} />
              </div>

              <div className={styles.milestoneSection}>
                <h4>作業ステップ</h4>
                <div
                  className={`${styles.unassignedSteps} ${isHoveredStepTarget(null) ? styles.stepDropZoneTarget : ''} ${
                    movedStepGroupId === 'unassigned' ? styles.movedStepGroup : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (
                      draggedProjectFormItem?.type === 'step' ||
                      draggedProjectFormItem?.type === 'stepGroup'
                    ) {
                      setHoveredStepTarget({ milestoneId: null })
                    }
                  }}
                  onDragLeave={() => {
                    setHoveredStepTarget(prev =>
                      prev?.milestoneId === null && !prev.stepId ? null : prev
                    )
                  }}
                  onDrop={() => handleProjectFormDrop(null)}
                >
                  <span className={styles.sectionLabel}>まだ区切りを決めていないステップ</span>
                  {isHoveredStepTarget(null) && draggedProjectFormItem?.type === 'step' && (
                    <div className={styles.stepDropHint}>ここにステップを移動</div>
                  )}
                  {isHoveredStepTarget(null) && draggedProjectFormItem?.type === 'stepGroup' && (
                    <div className={styles.stepGroupDropHint}>ここに全ステップを移動</div>
                  )}
                  {movedStepGroupId === 'unassigned' && (
                    <div className={styles.stepGroupFeedback}>全ステップを移動しました</div>
                  )}
                  {projectFormData.unassignedSteps.map(step => (
                    <div
                      key={step.id}
                      className={`${styles.stepForm} ${
                        draggedProjectFormItem?.type === 'step' &&
                        draggedProjectFormItem.stepId === step.id
                          ? styles.draggingStep
                          : ''
                      } ${
                        isHoveredStepTarget(null, step.id) ? styles.dropTargetStep : ''
                      } ${
                        movedStepId === step.id ? styles.movedStep : ''
                      }`}
                      draggable
                      onDragStart={() => {
                        setDraggedProjectFormItem({ type: 'step', milestoneId: null, stepId: step.id })
                        setHoveredStepTarget(null)
                      }}
                      onDragEnd={() => {
                        setDraggedProjectFormItem(null)
                        setHoveredStepTarget(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (draggedProjectFormItem?.type === 'step' && draggedProjectFormItem.stepId !== step.id) {
                          setHoveredStepTarget({ milestoneId: null, stepId: step.id })
                        }
                      }}
                      onDragLeave={() => {
                        setHoveredStepTarget(prev =>
                          prev?.milestoneId === null && prev.stepId === step.id ? null : prev
                        )
                      }}
                      onDrop={(e) => {
                        e.stopPropagation()
                        handleProjectFormDrop(null, step.id)
                      }}
                    >
                      <span className={styles.dragHandle}>⋮⋮</span>
                      <input
                        type="text"
                        value={step.text}
                        onChange={(e) => updateUnassignedStep(step.id, e.target.value)}
                        placeholder="ステップ名を入力"
                        className={styles.stepInput}
                      />
                      <button
                        onClick={() => removeUnassignedStep(step.id)}
                        className={styles.removeBtn}
                      >
                        ✕
                      </button>
                      {isHoveredStepTarget(null, step.id) && (
                        <span className={styles.inlineStepHint}>ここに移動</span>
                      )}
                      {movedStepId === step.id && (
                        <span className={styles.inlineStepFeedback}>移動しました</span>
                      )}
                    </div>
                  ))}

                  <div className={styles.addStepForm}>
                    <input
                      type="text"
                      value={projectFormData.newStepText}
                      onChange={(e) =>
                        setProjectFormData(prev => ({ ...prev, newStepText: e.target.value }))
                      }
                      onKeyPress={(e) => e.key === 'Enter' && addUnassignedStepToForm()}
                      placeholder="まずステップを書いてみる"
                      className={styles.input}
                    />
                    <button
                      onClick={addUnassignedStepToForm}
                      className={styles.submitBtn}
                    >
                      追加
                    </button>
                  </div>
                </div>

                <h4>区切り・段階</h4>
                <p className={styles.sectionHelp}>ステップをまとめる見出しです。ドラッグで順番を変えられます。</p>
                {projectFormData.milestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className={`${styles.milestoneForm} ${
                      movedMilestoneId === milestone.id ? styles.movedMilestone : ''
                    } ${
                      draggedProjectFormItem?.type === 'milestone' &&
                      draggedProjectFormItem.milestoneId === milestone.id
                        ? styles.draggingMilestone
                        : ''
                    } ${
                      isDraggingStepGroupFrom(milestone.id) ? styles.draggingStepGroup : ''
                    } ${
                      draggedProjectFormItem?.type === 'milestone' &&
                      draggedProjectFormItem.milestoneId !== milestone.id &&
                      hoveredMilestoneId === milestone.id
                        ? styles.dropTargetMilestone
                        : ''
                    } ${
                      isHoveredStepTarget(milestone.id) ? styles.stepDropZoneTarget : ''
                    } ${
                      movedStepGroupId === milestone.id ? styles.movedStepGroup : ''
                    }`}
                    onDragEnd={() => {
                      setDraggedProjectFormItem(null)
                      setHoveredMilestoneId(null)
                      setHoveredStepTarget(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (
                        draggedProjectFormItem?.type === 'milestone' &&
                        draggedProjectFormItem.milestoneId !== milestone.id
                      ) {
                        setHoveredMilestoneId(milestone.id)
                      } else if (
                        draggedProjectFormItem?.type === 'step' ||
                        (
                          draggedProjectFormItem?.type === 'stepGroup' &&
                          draggedProjectFormItem.milestoneId !== milestone.id
                        )
                      ) {
                        setHoveredStepTarget({ milestoneId: milestone.id })
                      }
                    }}
                    onDragLeave={() => {
                      setHoveredMilestoneId(prev => (prev === milestone.id ? null : prev))
                      setHoveredStepTarget(prev =>
                        prev?.milestoneId === milestone.id && !prev.stepId ? null : prev
                      )
                    }}
                    onDrop={(e) => {
                      e.stopPropagation()
                      if (draggedProjectFormItem?.type === 'milestone') {
                        moveMilestoneInForm(draggedProjectFormItem.milestoneId, milestone.id)
                        setHoveredMilestoneId(null)
                        setDraggedProjectFormItem(null)
                      } else {
                        handleProjectFormDrop(milestone.id)
                      }
                    }}
                  >
                    <div
                      className={styles.milestoneHeader}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        setDraggedProjectFormItem({ type: 'milestone', milestoneId: milestone.id })
                        setHoveredMilestoneId(null)
                        setHoveredStepTarget(null)
                      }}
                    >
                      <span className={styles.milestoneBadge}>区切り</span>
                      <span className={`${styles.dragHandle} ${styles.milestoneDragHandle}`}>⋮⋮</span>
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => updateMilestoneName(milestone.id, e.target.value)}
                        placeholder="区切り名を入力"
                        className={styles.milestoneInput}
                      />
                      <button
                        onClick={() => removeMilestoneFromForm(milestone.id)}
                        className={styles.removeBtn}
                      >
                        ✕
                      </button>
                    </div>
                    {movedMilestoneId === milestone.id && (
                      <div className={styles.moveFeedback}>順番を変更しました</div>
                    )}
                    {draggedProjectFormItem?.type === 'milestone' &&
                      draggedProjectFormItem.milestoneId !== milestone.id &&
                      hoveredMilestoneId === milestone.id && (
                        <div className={styles.dropHint}>ここに移動</div>
                      )}
                    {isHoveredStepTarget(milestone.id) && draggedProjectFormItem?.type === 'step' && (
                      <div className={styles.stepDropHint}>ここにステップを移動</div>
                    )}
                    {isHoveredStepTarget(milestone.id) && draggedProjectFormItem?.type === 'stepGroup' && (
                      <div className={styles.stepGroupDropHint}>ここに全ステップを移動</div>
                      )}
                    {movedStepGroupId === milestone.id && (
                      <div className={styles.stepGroupFeedback}>全ステップを移動しました</div>
                    )}

                    <div
                      className={styles.stepsForm}
                      draggable={milestone.steps.length > 0}
                      onDragStart={(e) => {
                        e.stopPropagation()
                        if (milestone.steps.length === 0) return
                        setDraggedProjectFormItem({ type: 'stepGroup', milestoneId: milestone.id })
                        setHoveredStepTarget(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (
                          draggedProjectFormItem?.type === 'stepGroup' &&
                          draggedProjectFormItem.milestoneId !== milestone.id
                        ) {
                          setHoveredStepTarget({ milestoneId: milestone.id })
                        }
                      }}
                      onDrop={(e) => {
                        e.stopPropagation()
                        handleProjectFormDrop(milestone.id)
                      }}
                    >
                      <div className={styles.stepsLabel}>ステップ</div>
                      {milestone.steps.map(step => (
                        <div
                          key={step.id}
                          className={`${styles.stepForm} ${
                            draggedProjectFormItem?.type === 'step' &&
                            draggedProjectFormItem.stepId === step.id
                              ? styles.draggingStep
                              : ''
                          } ${
                            isHoveredStepTarget(milestone.id, step.id) ? styles.dropTargetStep : ''
                          } ${
                            movedStepId === step.id ? styles.movedStep : ''
                          }`}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            setDraggedProjectFormItem({
                              type: 'step',
                              milestoneId: milestone.id,
                              stepId: step.id,
                            })
                            setHoveredStepTarget(null)
                          }}
                          onDragEnd={() => {
                            setDraggedProjectFormItem(null)
                            setHoveredStepTarget(null)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            if (draggedProjectFormItem?.type === 'step' && draggedProjectFormItem.stepId !== step.id) {
                              setHoveredStepTarget({ milestoneId: milestone.id, stepId: step.id })
                            }
                          }}
                          onDragLeave={() => {
                            setHoveredStepTarget(prev =>
                              prev?.milestoneId === milestone.id && prev.stepId === step.id ? null : prev
                            )
                          }}
                          onDrop={(e) => {
                            e.stopPropagation()
                            handleProjectFormDrop(milestone.id, step.id)
                          }}
                        >
                          <span className={styles.dragHandle}>⋮⋮</span>
                          <input
                            type="text"
                            value={step.text}
                            onChange={(e) => updateMilestoneStep(milestone.id, step.id, e.target.value)}
                            placeholder="ステップ名を入力"
                            className={styles.stepInput}
                          />
                          <button
                            onClick={() => removeStepFromMilestone(milestone.id, step.id)}
                            className={styles.removeBtn}
                          >
                            ✕
                          </button>
                          {isHoveredStepTarget(milestone.id, step.id) && (
                            <span className={styles.inlineStepHint}>ここに移動</span>
                          )}
                          {movedStepId === step.id && (
                            <span className={styles.inlineStepFeedback}>移動しました</span>
                          )}
                        </div>
                      ))}

                      <div className={styles.addStepForm}>
                        <input
                          type="text"
                          value={milestone.newStepText}
                          onChange={(e) =>
                            setProjectFormData(prev => ({
                              ...prev,
                              milestones: prev.milestones.map(m =>
                                m.id === milestone.id ? { ...m, newStepText: e.target.value } : m
                              ),
                            }))
                          }
                          onKeyPress={(e) => e.key === 'Enter' && addStepToMilestone(milestone.id)}
                          placeholder="この区切りにステップを追加"
                          className={styles.input}
                        />
                        <button
                          onClick={() => addStepToMilestone(milestone.id)}
                          className={styles.submitBtn}
                        >
                          追加
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className={styles.addMilestoneForm}>
                  <input
                    type="text"
                    value={projectFormData.newMilestoneName}
                    onChange={(e) => setProjectFormData(prev => ({ ...prev, newMilestoneName: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && addMilestoneToForm()}
                    placeholder="区切り名を入力"
                    className={styles.input}
                  />
                  <button onClick={addMilestoneToForm} className={styles.submitBtn}>
                    区切り追加
                  </button>
                </div>
              </div>

              <button
                onClick={addProject}
                disabled={
                  !projectFormData.name.trim() ||
                  (
                    projectFormData.unassignedSteps.length === 0 &&
                    !projectFormData.milestones.some(m => m.steps.length > 0)
                  )
                }
                className={styles.submitBtn}
                style={{
                  opacity:
                    !projectFormData.name.trim() ||
                    (
                      projectFormData.unassignedSteps.length === 0 &&
                      !projectFormData.milestones.some(m => m.steps.length > 0)
                    )
                      ? 0.5
                      : 1,
                  cursor:
                    !projectFormData.name.trim() ||
                    (
                      projectFormData.unassignedSteps.length === 0 &&
                      !projectFormData.milestones.some(m => m.steps.length > 0)
                    )
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                プロジェクトを作成
              </button>
              <p className={styles.pointsInfo}>
                作成後、ステップ完了や区切り達成でポイントが入ります。
              </p>
            </div>
          </div>
        )}
      </div>
      <div className={styles.toolButtons}>
        <button
          type="button"
          className={styles.toolButton}
          onClick={clearCompletedRecords}
          title="チェック済みタスクを納品してポイントを確定"
          aria-label="チェック済みタスクを納品してポイントを確定"
        >
          💰
        </button>
        <button
          type="button"
          className={styles.toolButton}
          onClick={loadDemoTodos}
          title="確認用サンプルTODOを入れる"
          aria-label="確認用サンプルTODOを入れる"
        >
          🧪
        </button>
        <button
          type="button"
          className={`${styles.toolButton} ${hideCompletedTasks ? styles.toolButtonActive : ''}`}
          onClick={() => setHideCompletedTasks(prev => !prev)}
          title="完成したタスクを非表示"
          aria-label="完成したタスクを非表示"
          aria-pressed={hideCompletedTasks}
        >
          {hideCompletedTasks ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

export default TodoPanel

'use client'

import React, { useRef, useState } from 'react'
import styles from './TodoPanel.module.css'
import {
  Difficulty,
  Project,
  SingleTask,
  TodoItem,
  TODO_SESSION_STORAGE_KEY,
  TODO_DIFFICULTY_POINTS,
  TODO_MILESTONE_POINTS,
  TODO_PROJECT_POINTS,
  TODO_STEP_POINTS,
  createDemoTodoSession,
  getTodoTimestamp,
  normalizeTodoSession,
} from '@/utils/todoSession'
import {
  clearTodoSessionPendingSync,
  getLocalTodoSessionUpdatedAt,
  hasTodoSessionPendingSync,
  isRemoteTodoSessionNewer,
  isTodoSupabaseSyncConfigured,
  loadRemoteTodoSession,
  markTodoSessionPendingSync,
  saveLocalTodoSession,
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

const calculatePoints = (item: TodoItem): number => {
  if (item.type === 'single') {
    const task = item.data as SingleTask
    return TODO_DIFFICULTY_POINTS[task.difficulty]
  } else {
    // プロジェクトポイント計算
    const project = item.data as Project
    let points = TODO_PROJECT_POINTS
    let completedSteps = 0
    let totalSteps = 0

    project.milestones.forEach(milestone => {
      points += TODO_MILESTONE_POINTS
      milestone.steps.forEach(step => {
        totalSteps++
        if (step.completed) completedSteps++
        points += TODO_STEP_POINTS
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
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false)
  
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
    const todoSession = { todos, earnedPoints }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      window.dispatchEvent(new CustomEvent('todo-session-updated', { detail: todoSession }))
      return
    }

    const updatedAt = getTodoTimestamp()
    saveLocalTodoSession(todoSession, updatedAt)
    window.dispatchEvent(new CustomEvent('todo-session-updated', { detail: todoSession }))

    if (!isTodoSupabaseSyncConfigured()) return

    saveRemoteTodoSession(todoSession, updatedAt)
      .then(() => {
        clearTodoSessionPendingSync()
      })
      .catch(() => {
        markTodoSessionPendingSync()
      })
  }, [todos, earnedPoints])

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
          saveLocalTodoSession(remoteSession.session, remoteSession.updatedAt)
          window.dispatchEvent(
            new CustomEvent('todo-session-updated', { detail: remoteSession.session })
          )
          return
        }

        const shouldPushLocalSession = !remoteSession || hasTodoSessionPendingSync()

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
            id: Date.now().toString(),
            text: newTodoText,
            difficulty: selectedDifficulty,
            completed: false,
            createdAt,
          },
        },
      ])
      setNewTodoText('')
      setSelectedDifficulty('medium')
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
            id: Date.now().toString(),
            name: projectFormData.name,
            milestones: [...unassignedMilestone, ...milestones],
            completed: false,
            createdAt,
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
    }
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
    let pointsToAdd = 0
    const completedAt = getTodoTimestamp()

    const newTodos = todos.map(todo => {
      if (todo.type === 'single' && todo.data.id === id) {
        const task = todo.data as SingleTask
        const isNowCompleted = !task.completed

        if (isNowCompleted) {
          pointsToAdd = TODO_DIFFICULTY_POINTS[task.difficulty]
        }

        return {
          ...todo,
          data: {
            ...task,
            completed: isNowCompleted,
            completedAt: isNowCompleted ? completedAt : undefined,
          },
        }
      }
      return todo
    })

    setTodos(newTodos)
    setEarnedPoints(prev => prev + pointsToAdd)
  }

  const toggleProjectStep = (projectId: string, milestoneId: string, stepId: string) => {
    let pointsToAdd = 0
    const completedAt = getTodoTimestamp()

    const newTodos = todos.map(todo => {
      if (todo.type === 'project' && todo.data.id === projectId) {
        const project = todo.data as Project
        
        // 更新前の状態を取得
        const oldMilestoneCompleted = project.milestones.find(m => m.id === milestoneId)?.completed || false
        const oldProjectCompleted = project.completed
        
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
                        completedAt: !s.completed ? completedAt : undefined,
                      }
                    : s
                ),
                completed: m.steps.every(s => s.id === stepId ? !s.completed : s.completed),
                completedAt: m.steps.every(s => s.id === stepId ? !s.completed : s.completed)
                  ? m.completedAt || completedAt
                  : undefined,
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
        
        if (isStepNowCompleted) {
          pointsToAdd += TODO_STEP_POINTS
        }
        
        // マイルストーン完成ボーナス（未完了→完了のとき）
        if (!oldMilestoneCompleted && newMilestoneCompleted) {
          pointsToAdd += TODO_MILESTONE_POINTS
        }
        
        // プロジェクト完成ボーナス（未完了→完了のとき）
        if (!oldProjectCompleted && newProjectCompleted) {
          pointsToAdd += TODO_PROJECT_POINTS
        }
        
        return {
          ...todo,
          data: {
            ...project,
            milestones: newMilestones,
            completed: newProjectCompleted,
            completedAt: newProjectCompleted ? (project.completedAt || completedAt) : undefined,
          },
        }
      }
      return todo
    })
    
    setTodos(newTodos)
    setEarnedPoints(prev => prev + pointsToAdd)
  }

  const deleteTodo = (id: string) => {
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
    if (!hasCompletedRecords()) {
      window.alert('完成済みの記録はありません。')
      return
    }

    if (
      typeof window !== 'undefined' &&
      window.confirm('完成済みの記録を消しますか？獲得済みのTODOポイントは残ります。')
    ) {
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

      setTodos(activeTodos)
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
        <span className={styles.pointsBadge}>{earnedPoints}pts</span>
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
                  <span className={styles.points}>+{calculatePoints(todo)}pt</span>
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
                <button onClick={addSingleTask} className={styles.submitBtn}>
                  追加
                </button>
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
          title="完成済みの記録を消す"
          aria-label="完成済みの記録を消す"
        >
          🧹
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

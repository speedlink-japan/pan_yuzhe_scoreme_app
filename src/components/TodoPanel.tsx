'use client'

import React, { useState } from 'react'
import styles from './TodoPanel.module.css'

type Difficulty = 'easy' | 'medium' | 'hard'

interface Step {
  id: string
  text: string
  completed: boolean
}

interface Milestone {
  id: string
  name: string
  steps: Step[]
  completed: boolean
}

interface Project {
  id: string
  name: string
  milestones: Milestone[]
  completed: boolean
}

interface SingleTask {
  id: string
  text: string
  difficulty: Difficulty
  completed: boolean
}

interface TodoItem {
  type: 'single' | 'project'
  data: SingleTask | Project
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
    const difficultyPoints = {
      easy: 10,
      medium: 25,
      hard: 50,
    }
    return difficultyPoints[task.difficulty]
  } else {
    // プロジェクトポイント計算
    const project = item.data as Project
    let points = 50 // 基本ボーナス
    let completedSteps = 0
    let totalSteps = 0

    project.milestones.forEach(milestone => {
      points += 20 // マイルストーンボーナス
      milestone.steps.forEach(step => {
        totalSteps++
        if (step.completed) completedSteps++
        points += 8 // ステップポイント
      })
    })

    return points
  }
}

interface TodoPanelProps {
  onPointsChange?: (points: number) => void
}

const TodoPanel: React.FC<TodoPanelProps> = ({ onPointsChange }) => {
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      type: 'single',
      data: {
        id: '1',
        text: 'Sample Easy Task',
        difficulty: 'easy',
        completed: false,
      },
    },
    {
      type: 'single',
      data: {
        id: '2',
        text: 'Sample Medium Task',
        difficulty: 'medium',
        completed: false,
      },
    },
  ])

  const [newTodoText, setNewTodoText] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium')
  const [activeTab, setActiveTab] = useState<'tasks' | 'create'>('tasks')
  const [earnedPoints, setEarnedPoints] = useState(0)
  
  // プロジェクト作成フォーム用
  interface ProjectFormMilestone {
    id: string
    name: string
    steps: { id: string; text: string }[]
    newStepText: string
  }
  
  const [projectFormData, setProjectFormData] = useState<{
    name: string
    milestones: ProjectFormMilestone[]
    newMilestoneName: string
  }>({
    name: '',
    milestones: [],
    newMilestoneName: '',
  })

  // ポイント変更を親に通知
  React.useEffect(() => {
    onPointsChange?.(earnedPoints)
  }, [earnedPoints, onPointsChange])

  const addSingleTask = () => {
    if (newTodoText.trim()) {
      setTodos([
        ...todos,
        {
          type: 'single',
          data: {
            id: Date.now().toString(),
            text: newTodoText,
            difficulty: selectedDifficulty,
            completed: false,
          },
        },
      ])
      setNewTodoText('')
      setSelectedDifficulty('medium')
    }
  }

  const addProject = () => {
    if (projectFormData.name.trim() && projectFormData.milestones.length > 0) {
      const milestones = projectFormData.milestones.map(m => ({
        id: m.id,
        name: m.name,
        steps: m.steps.map(s => ({
          id: s.id,
          text: s.text,
          completed: false,
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
            milestones: milestones,
            completed: false,
          },
        },
      ])
      
      // フォームをリセット
      setProjectFormData({
        name: '',
        milestones: [],
        newMilestoneName: '',
      })
      setActiveTab('tasks')
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

  const removeMilestoneFromForm = (milestoneId: string) => {
    setProjectFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId),
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

  const toggleSingleTask = (id: string) => {
    let pointsToAdd = 0

    const newTodos = todos.map(todo => {
      if (todo.type === 'single' && todo.data.id === id) {
        const task = todo.data as SingleTask
        const isNowCompleted = !task.completed

        if (isNowCompleted) {
          const difficultyPoints = {
            easy: 10,
            medium: 25,
            hard: 50,
          }
          pointsToAdd = difficultyPoints[task.difficulty]
        }

        return {
          ...todo,
          data: { ...task, completed: isNowCompleted },
        }
      }
      return todo
    })

    setTodos(newTodos)
    setEarnedPoints(prev => prev + pointsToAdd)
  }

  const toggleProjectStep = (projectId: string, milestoneId: string, stepId: string) => {
    let pointsToAdd = 0

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
                  s.id === stepId ? { ...s, completed: !s.completed } : s
                ),
                completed: m.steps.every(s => s.id === stepId ? !s.completed : s.completed),
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
          pointsToAdd += 8 // ステップポイント
        }
        
        // マイルストーン完成ボーナス（未完了→完了のとき）
        if (!oldMilestoneCompleted && newMilestoneCompleted) {
          pointsToAdd += 10
        }
        
        // プロジェクト完成ボーナス（未完了→完了のとき）
        if (!oldProjectCompleted && newProjectCompleted) {
          pointsToAdd += 50
        }
        
        return {
          ...todo,
          data: {
            ...project,
            milestones: newMilestones,
            completed: newProjectCompleted,
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
          Tasks
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
          onClick={() => setActiveTab('create')}
        >
          + Create
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'tasks' ? (
          <div className={styles.todoList}>
            {todos.map(todo => (
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
              <h3>➕ Single Task</h3>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSingleTask()}
                  placeholder="Task name..."
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
                  Add Task
                </button>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>📊 Project</h3>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  value={projectFormData.name}
                  onChange={(e) => setProjectFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name..."
                  className={styles.input}
                />
              </div>

              <div className={styles.milestoneSection}>
                <h4>📍 Milestones (区切り)</h4>
                {projectFormData.milestones.map(milestone => (
                  <div key={milestone.id} className={styles.milestoneForm}>
                    <div className={styles.milestoneHeader}>
                      <span className={styles.milestoneName}>{milestone.name}</span>
                      <button
                        onClick={() => removeMilestoneFromForm(milestone.id)}
                        className={styles.removeBtn}
                      >
                        ✕
                      </button>
                    </div>

                    <div className={styles.stepsForm}>
                      {milestone.steps.map(step => (
                        <div key={step.id} className={styles.stepForm}>
                          <input
                            type="text"
                            value={step.text}
                            onChange={(e) => updateMilestoneStep(milestone.id, step.id, e.target.value)}
                            placeholder="Step name..."
                            className={styles.stepInput}
                          />
                          <button
                            onClick={() => removeStepFromMilestone(milestone.id, step.id)}
                            className={styles.removeBtn}
                          >
                            ✕
                          </button>
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
                          placeholder="Add step..."
                          className={styles.input}
                        />
                        <button
                          onClick={() => addStepToMilestone(milestone.id)}
                          className={styles.submitBtn}
                        >
                          + Step
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
                    placeholder="Milestone name..."
                    className={styles.input}
                  />
                  <button onClick={addMilestoneToForm} className={styles.submitBtn}>
                    + Milestone
                  </button>
                </div>
              </div>

              <button
                onClick={addProject}
                disabled={!projectFormData.name.trim() || projectFormData.milestones.length === 0}
                className={styles.submitBtn}
                style={{
                  opacity: !projectFormData.name.trim() || projectFormData.milestones.length === 0 ? 0.5 : 1,
                  cursor: !projectFormData.name.trim() || projectFormData.milestones.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Create Project
              </button>
              <p className={styles.pointsInfo}>
                Project Base: 50pts + 20pts per Milestone + 8pts per Step
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TodoPanel

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  Project,
  SingleTask,
  TodoItem,
  TodoPointHistoryItem,
  getAvailablePoints,
  getTodoMilestonePoints,
  getTodoPointHistory,
  getTodoProjectPoints,
  getTodoStepPoints,
  normalizeTodoSession,
} from '../src/utils/todoSession'
import {
  cloneTodoFromHistory,
  createTodoHistoryRedoPlan,
} from '../src/utils/todoHistoryRestore'

const timestamp = '2026-07-23T10:00:00.000Z'
const fixedIdFactory = (prefix: string) => `${prefix}-new`

const createCompletedProject = (): TodoItem => ({
  type: 'project',
  data: {
    id: 'project-1',
    name: 'Project 1',
    completed: true,
    completedAt: timestamp,
    createdAt: timestamp,
    milestones: [
      {
        id: 'milestone-1',
        name: 'Milestone 1',
        completed: true,
        completedAt: timestamp,
        steps: [
          {
            id: 'step-1',
            text: 'Step 1',
            completed: true,
            completedAt: timestamp,
            createdAt: timestamp,
          },
          {
            id: 'step-2',
            text: 'Step 2',
            completed: true,
            completedAt: timestamp,
            createdAt: timestamp,
          },
        ],
      },
    ],
  },
})

const getTodoMaximumReward = (todo: TodoItem): number => {
  if (todo.type === 'single') return 0
  const project = todo.data as Project
  return (
    getTodoProjectPoints(project) +
    project.milestones.reduce(
      (milestoneTotal, milestone) =>
        milestoneTotal +
        getTodoMilestonePoints(milestone) +
        milestone.steps.reduce(
          (stepTotal, step) => stepTotal + getTodoStepPoints(step),
          0
        ),
      0
    )
  )
}

test('pending points are deduplicated, validated and recalculated from the checked task', () => {
  const todo: TodoItem = {
    type: 'single',
    data: {
      id: 'task-1',
      text: 'Checked task',
      difficulty: 'easy',
      completed: true,
      createdAt: timestamp,
      completedAt: timestamp,
    },
  }
  const duplicate: TodoPointHistoryItem = {
    id: 'single-task-1',
    title: 'tampered',
    type: 'single',
    points: 999,
    completedAt: timestamp,
  }

  const session = normalizeTodoSession({
    todos: [todo],
    earnedPoints: 0,
    archivedPointHistory: [],
    hiddenPointHistoryIds: [],
    pendingPointHistory: [duplicate, duplicate, { ...duplicate, id: 'single-missing' }],
  })

  assert.equal(session.pendingPointHistory.length, 1)
  assert.equal(session.pendingPointHistory[0].id, 'single-task-1')
  assert.equal(session.pendingPointHistory[0].points, 10)
  assert.equal(session.pendingPointHistory[0].title, 'Checked task')
})

test('step redo subtracts and restores exactly the step reward', () => {
  const history = getTodoPointHistory([createCompletedProject()])
  const selected = history.find(item => item.type === 'project-step')!
  const plan = createTodoHistoryRedoPlan(selected, history, {
    createdAt: timestamp,
    idFactory: fixedIdFactory,
  })!

  assert.equal(plan.points, 8)
  assert.equal(getTodoMaximumReward(plan.todo), 8)
})

test('milestone redo subtracts and restores the same milestone reward scope', () => {
  const history = getTodoPointHistory([createCompletedProject()])
  const selected = history.find(item => item.type === 'milestone')!
  const plan = createTodoHistoryRedoPlan(selected, history, {
    createdAt: timestamp,
    idFactory: fixedIdFactory,
  })!

  assert.equal(plan.points, 26)
  assert.equal(getTodoMaximumReward(plan.todo), 26)
})

test('project redo subtracts and restores the complete project reward scope', () => {
  const history = getTodoPointHistory([createCompletedProject()])
  const selected = history.find(item => item.type === 'project')!
  const plan = createTodoHistoryRedoPlan(selected, history, {
    createdAt: timestamp,
    idFactory: fixedIdFactory,
  })!

  assert.equal(plan.points, 76)
  assert.equal(getTodoMaximumReward(plan.todo), 76)
  assert.deepEqual(new Set(plan.historyIds), new Set(history.map(item => item.id)))
})

test('legacy single-task history infers difficulty from its original points', () => {
  const easy = cloneTodoFromHistory(
    {
      id: 'legacy-easy',
      title: 'Legacy easy',
      type: 'single',
      points: 10,
      completedAt: timestamp,
    },
    [],
    { createdAt: timestamp, idFactory: fixedIdFactory }
  )!
  const hard = cloneTodoFromHistory(
    {
      id: 'legacy-hard',
      title: 'Legacy hard',
      type: 'single',
      points: 50,
      completedAt: timestamp,
    },
    [],
    { createdAt: timestamp, idFactory: fixedIdFactory }
  )!

  assert.equal((easy.data as SingleTask).difficulty, 'easy')
  assert.equal((hard.data as SingleTask).difficulty, 'hard')
})

test('available points use the unified earned-minus-spent formula and allow negatives', () => {
  const session = normalizeTodoSession({
    todos: [],
    earnedPoints: 20,
    archivedPointHistory: [],
    pendingPointHistory: [],
    hiddenPointHistoryIds: [],
    studyBooks: [
      {
        id: 'book-1',
        title: 'Book',
        category: 'bunko',
        pageCount: 2,
        createdAt: timestamp,
        points: 999,
      },
    ],
    notebookMemos: [
      {
        id: 'memo-1',
        title: 'Memo',
        content: '12345678901234567890',
        color: '#fff',
        createdAt: timestamp,
        points: 999,
      },
    ],
    characterShop: {
      spentPoints: 40,
      outfit: 'whiteSkirt',
      activeItem: 'none',
      ownedItems: ['whiteSkirt', 'none'],
    },
  })

  assert.equal(getAvailablePoints(session), -12)
})

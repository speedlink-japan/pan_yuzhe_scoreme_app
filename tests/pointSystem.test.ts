import test from 'node:test'
import assert from 'node:assert/strict'
import {
  Project,
  SingleTask,
  TodoItem,
  TodoPointHistoryItem,
  createSingleTaskFromPreset,
  finalizeTodoDelivery,
  getAvailablePoints,
  getTodoMilestonePoints,
  getTodoDateKey,
  getTodoPointHistory,
  getTodoProjectPoints,
  getTodoStepPoints,
  normalizeTodoSession,
  resolveTodoReward,
} from '../src/utils/todoSession'
import {
  DEFAULT_POINT_RULES,
  calculateMemoPoints,
  calculateReadingPoints,
  getPointBalances,
  getPointLedgerByDate,
  normalizeDailyReviews,
  normalizePointLedger,
  toggleDailyReviewValue,
  upsertDailyReview,
  updatePointLedgerEntries,
  upsertPointLedgerEntry,
} from '../src/utils/pointLedger'
import {
  completeDailyReview,
  getDailyReviewSummary,
  getReviewOutcomesForDate,
  saveDailyReviewDraft,
} from '../src/utils/dailyReview'
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

test('pending points are deduplicated and preserve the reward fixed when checked', () => {
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
    points: 17,
    account: 'rest',
    sourceId: 'todo:single-task-1',
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
  assert.equal(session.pendingPointHistory[0].points, 17)
  assert.equal(session.pendingPointHistory[0].account, 'rest')
  assert.equal(session.pendingPointHistory[0].sourceId, 'todo:single-task-1')
  assert.equal(session.pendingPointHistory[0].title, 'Checked task')
})

test('todo reward priority is override, category, Todo default, then effort', () => {
  const rules = { ...DEFAULT_POINT_RULES, todoAccount: 'rest' as const }
  const categories = [{ id: 'routine', name: '日課', account: 'effort' as const, points: 12 }]
  const base: TodoItem = {
    type: 'single',
    data: { id: 'priority', text: 'Priority', difficulty: 'hard', completed: false, createdAt: timestamp },
  }

  assert.deepEqual(resolveTodoReward(base, [], rules), { account: 'rest', points: 50 })
  assert.deepEqual(resolveTodoReward({ ...base, data: { ...base.data, categoryId: 'routine' } } as TodoItem, categories, rules), { account: 'effort', points: 12 })
  assert.deepEqual(resolveTodoReward({ ...base, data: { ...base.data, categoryId: 'routine', pointAccount: 'rest', pointOverride: 7 } } as TodoItem, categories, rules), { account: 'rest', points: 7 })
  assert.equal(resolveTodoReward(base, [], { ...DEFAULT_POINT_RULES, todoAccount: undefined as never }).account, 'effort')
})

test('preset reuse creates unique incomplete tasks without mutating the preset', () => {
  const preset = { id: 'preset-1', title: 'ピアノ', difficulty: 'easy' as const, categoryId: 'music' }
  const first = createSingleTaskFromPreset(preset, timestamp, 'task-a')
  const second = createSingleTaskFromPreset(preset, timestamp, 'task-b')
  assert.notEqual(first.data.id, second.data.id)
  assert.equal((first.data as SingleTask).completed, false)
  assert.equal((second.data as SingleTask).completedAt, undefined)
  assert.equal(preset.id, 'preset-1')
})

test('single and every project award use the resolved Todo account', () => {
  const single: TodoItem = {
    type: 'single',
    data: { id: 'single-rest', text: 'Rest task', difficulty: 'easy', completed: true, createdAt: timestamp, completedAt: timestamp, pointAccount: 'rest' },
  }
  const project = createCompletedProject()
  project.data = { ...project.data, pointAccount: 'rest', pointOverride: 21 } as Project
  const history = getTodoPointHistory([single, project], [], [], [], DEFAULT_POINT_RULES)
  assert.equal(history.find(item => item.type === 'single')?.account, 'rest')
  assert.deepEqual(new Set(history.filter(item => item.id.includes('project-1')).map(item => item.account)), new Set(['rest']))
  assert.equal(history.find(item => item.type === 'project')?.points, 21)
  assert.equal(history.find(item => item.type === 'project-step')?.points, 8)
  assert.equal(history.find(item => item.type === 'milestone')?.points, 10)
})

test('legacy pending without account resolves through category and keeps its checked points', () => {
  const session = normalizeTodoSession({
    todos: [{ type: 'single', data: { id: 'legacy-pending', text: 'Legacy', difficulty: 'hard', completed: true, createdAt: timestamp, completedAt: timestamp, categoryId: 'routine' } }],
    pendingPointHistory: [{ id: 'single-legacy-pending', title: 'Legacy', type: 'single', points: 13, completedAt: timestamp }],
    taskCategories: [{ id: 'routine', name: '日課', account: 'rest', points: 30 }],
    pointRules: DEFAULT_POINT_RULES,
  }, timestamp)
  assert.equal(session.pendingPointHistory[0].account, 'rest')
  assert.equal(session.pendingPointHistory[0].points, 13)
})

test('delivery archives and ledgers the checked snapshot after rules change', () => {
  const checked = normalizeTodoSession({
    todos: [{ type: 'single', data: { id: 'frozen', text: 'Frozen', difficulty: 'easy', completed: true, createdAt: timestamp, completedAt: timestamp } }],
    pendingPointHistory: [{ id: 'single-frozen', title: 'Frozen', type: 'single', points: 14, account: 'rest', sourceId: 'todo:single-frozen', completedAt: timestamp }],
    pointRules: { ...DEFAULT_POINT_RULES, todoAccount: 'effort' },
    pointLedger: [],
    earnedPoints: 3,
  }, timestamp)
  const changedRules = { ...checked, pointRules: { ...checked.pointRules, todoAccount: 'effort' as const } }
  const delivered = finalizeTodoDelivery(changedRules, [])
  assert.equal(delivered.earnedPoints, 17)
  assert.equal(delivered.archivedPointHistory[0].points, 14)
  assert.equal(delivered.archivedPointHistory[0].account, 'rest')
  assert.deepEqual(delivered.pointLedger.find(entry => entry.sourceId === 'todo:single-frozen'), {
    id: 'ledger-single-frozen', sourceType: 'todo', sourceId: 'todo:single-frozen', title: 'Frozen', account: 'rest', points: 14, occurredAt: timestamp, reason: 'Todo納品',
  })
  assert.equal(delivered.pendingPointHistory.length, 0)
})

test('bulk ledger edits survive normalization and clamp negatives by source type', () => {
  const ledger = normalizePointLedger([
    { id: 'todo-edit', sourceType: 'todo', sourceId: 'todo:edit', title: 'Todo', account: 'effort', points: 4, occurredAt: timestamp },
    { id: 'manual-edit', sourceType: 'manual-adjustment', sourceId: 'manual:edit', title: 'Manual', account: 'effort', points: 1, occurredAt: timestamp, reason: '調整' },
  ], timestamp)
  const edited = updatePointLedgerEntries(ledger, ['todo-edit', 'manual-edit'], { account: 'rest', points: -6 })
  const normalized = normalizePointLedger(edited, timestamp)
  assert.deepEqual(normalized.map(entry => [entry.id, entry.account, entry.points]), [
    ['todo-edit', 'rest', 0],
    ['manual-edit', 'rest', -6],
  ])
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
        points: 6,
      },
    ],
    notebookMemos: [
      {
        id: 'memo-1',
        title: 'Memo',
        content: '12345678901234567890',
        color: '#fff',
        createdAt: timestamp,
        points: 2,
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
  assert.deepEqual(getPointBalances(session.pointLedger), {
    effort: 28,
    rest: 0,
    total: 28,
  })
  assert.equal(session.characterShop.spentPoints, 40)
})

test('default point rules match the reading, memo and review requirements', () => {
  assert.deepEqual(DEFAULT_POINT_RULES.readingPagesPerPoint, {
    manga: 20,
    magazine: 12,
    bunko: 10,
    textbook: 5,
    paper: 2,
  })
  assert.equal(DEFAULT_POINT_RULES.memoCharactersPerPoint, 100)
  assert.equal(DEFAULT_POINT_RULES.reviewPoints, 3)
  assert.equal(calculateReadingPoints('manga', 39), 1)
  assert.equal(calculateReadingPoints('paper', 4), 2)
  assert.equal(calculateMemoPoints(199), 1)
  assert.equal(normalizeTodoSession({
    pointRules: { ...DEFAULT_POINT_RULES, reviewPoints: 0 },
  }, timestamp).pointRules.reviewPoints, 0)
})

test('reading points cover minimums, boundaries, categories and normalized custom rules', () => {
  assert.deepEqual(
    [1, 19, 20, 39, 40].map(pages => calculateReadingPoints('manga', pages)),
    [1, 1, 1, 1, 2]
  )
  assert.deepEqual(
    ['manga', 'magazine', 'bunko', 'textbook', 'paper'].map(category =>
      calculateReadingPoints(category as keyof typeof DEFAULT_POINT_RULES.readingPagesPerPoint, 20)
    ),
    [1, 1, 2, 4, 10]
  )
  assert.equal(calculateReadingPoints('paper', 0), 0)
  assert.equal(calculateReadingPoints('paper', -1), 0)
  assert.equal(calculateReadingPoints('paper', Number.NaN), 0)
  assert.equal(calculateReadingPoints('paper', 0.5), 1)
  assert.equal(calculateReadingPoints('paper', 5, {
    ...DEFAULT_POINT_RULES,
    readingPagesPerPoint: { ...DEFAULT_POINT_RULES.readingPagesPerPoint, paper: 2.9 },
  }), 2)
  assert.equal(calculateReadingPoints('paper', 5, {
    ...DEFAULT_POINT_RULES,
    readingPagesPerPoint: { ...DEFAULT_POINT_RULES.readingPagesPerPoint, paper: -4 },
  }), 2)
})

test('memo points cover minimums, boundaries and normalized custom rules', () => {
  assert.deepEqual(
    [1, 99, 100, 199, 200].map(length => calculateMemoPoints(length)),
    [1, 1, 1, 1, 2]
  )
  assert.equal(calculateMemoPoints(0), 0)
  assert.equal(calculateMemoPoints(-1), 0)
  assert.equal(calculateMemoPoints(Number.POSITIVE_INFINITY), 0)
  assert.equal(calculateMemoPoints(0.5), 1)
  assert.equal(calculateMemoPoints(11, {
    ...DEFAULT_POINT_RULES,
    memoCharactersPerPoint: 5.8,
  }), 2)
  assert.equal(calculateMemoPoints(100, {
    ...DEFAULT_POINT_RULES,
    memoCharactersPerPoint: 0,
  }), 1)
})

test('reading and memo awards freeze default or overridden accounts across rule changes', () => {
  const saved = normalizeTodoSession({
    pointRules: {
      ...DEFAULT_POINT_RULES,
      readingAccount: 'rest',
      memoAccount: 'effort',
    },
    studyBooks: [{
      id: 'book-default-account', title: 'Default account', category: 'paper', pageCount: 2,
      createdAt: timestamp, points: 1,
    }, {
      id: 'book-override-account', title: 'Override account', category: 'paper', pageCount: 2,
      createdAt: timestamp, points: 1, pointAccount: 'effort',
    }],
    notebookMemos: [{
      id: 'memo-default-account', title: 'Default memo', content: 'x', color: '#fff',
      createdAt: timestamp, points: 1,
    }, {
      id: 'memo-override-account', title: 'Override memo', content: 'y', color: '#fff',
      createdAt: timestamp, points: 1, pointAccount: 'rest',
    }],
  }, timestamp)

  assert.deepEqual(saved.studyBooks.map(book => book.pointAccount), ['rest', 'effort'])
  assert.deepEqual(saved.notebookMemos.map(memo => memo.pointAccount), ['effort', 'rest'])
  assert.deepEqual(saved.pointLedger.filter(entry => entry.sourceType === 'reading').map(entry => entry.account), ['rest', 'effort'])
  assert.deepEqual(saved.pointLedger.filter(entry => entry.sourceType === 'memo').map(entry => entry.account), ['effort', 'rest'])

  const reloaded = normalizeTodoSession({
    ...saved,
    pointRules: { ...saved.pointRules, readingAccount: 'effort', memoAccount: 'rest' },
  }, timestamp)
  assert.equal(reloaded.pointLedger.length, saved.pointLedger.length)
  assert.deepEqual(reloaded.studyBooks.map(book => book.pointAccount), ['rest', 'effort'])
  assert.deepEqual(reloaded.notebookMemos.map(memo => memo.pointAccount), ['effort', 'rest'])
})

test('reading and memo normalization keeps existing ledger edits and unique source ids', () => {
  const session = normalizeTodoSession({
    pointRules: DEFAULT_POINT_RULES,
    studyBooks: [{ id: 'same-book', title: 'Book', category: 'bunko', pageCount: 10, createdAt: timestamp, points: 1, pointAccount: 'effort' }],
    notebookMemos: [{ id: 'same-memo', title: 'Memo', content: 'x', color: '#fff', createdAt: timestamp, points: 1, pointAccount: 'effort' }],
    pointLedger: [
      { id: 'edited-reading', sourceType: 'reading', sourceId: 'reading:same-book', title: 'Edited book', account: 'rest', points: 9, occurredAt: timestamp },
      { id: 'edited-reading-duplicate', sourceType: 'reading', sourceId: 'reading:same-book', title: 'Latest edit', account: 'rest', points: 8, occurredAt: timestamp },
      { id: 'edited-memo', sourceType: 'memo', sourceId: 'memo:same-memo', title: 'Edited memo', account: 'rest', points: 7, occurredAt: timestamp },
    ],
  }, timestamp)
  const reloaded = normalizeTodoSession(JSON.parse(JSON.stringify(session)), timestamp)

  assert.equal(reloaded.pointLedger.filter(entry => entry.sourceId === 'reading:same-book').length, 1)
  assert.equal(reloaded.pointLedger.filter(entry => entry.sourceId === 'memo:same-memo').length, 1)
  assert.equal(reloaded.pointLedger.find(entry => entry.sourceId === 'reading:same-book')?.points, 8)
  assert.equal(reloaded.pointLedger.find(entry => entry.sourceId === 'memo:same-memo')?.points, 7)
  assert.equal(reloaded.studyBooks[0].points, 8)
  assert.equal(reloaded.notebookMemos[0].points, 7)
  assert.equal(reloaded.studyBooks[0].pointAccount, 'rest')
  assert.equal(reloaded.notebookMemos[0].pointAccount, 'rest')
})

test('bulk reading and memo ledger edits sync record points through a JSON round trip', () => {
  const saved = normalizeTodoSession({
    pointRules: DEFAULT_POINT_RULES,
    studyBooks: [{
      id: 'bulk-book', title: 'Bulk book', category: 'paper', pageCount: 4,
      createdAt: timestamp, points: 2, pointAccount: 'effort',
    }],
    notebookMemos: [{
      id: 'bulk-memo', title: 'Bulk memo', content: 'x'.repeat(100), color: '#fff',
      createdAt: timestamp, points: 1, pointAccount: 'effort',
    }],
  }, timestamp)
  const awardIds = saved.pointLedger
    .filter(entry => entry.sourceType === 'reading' || entry.sourceType === 'memo')
    .map(entry => entry.id)
  const bulkEdited = {
    ...saved,
    pointLedger: updatePointLedgerEntries(saved.pointLedger, awardIds, {
      account: 'rest',
      points: 6,
    }),
  }

  const reloaded = normalizeTodoSession(JSON.parse(JSON.stringify(bulkEdited)), timestamp)

  assert.equal(reloaded.studyBooks[0].points, 6)
  assert.equal(reloaded.notebookMemos[0].points, 6)
  assert.equal(reloaded.studyBooks[0].pointAccount, 'rest')
  assert.equal(reloaded.notebookMemos[0].pointAccount, 'rest')
  assert.equal(reloaded.pointLedger.find(entry => entry.sourceId === 'reading:bulk-book')?.points, 6)
  assert.equal(reloaded.pointLedger.find(entry => entry.sourceId === 'memo:bulk-memo')?.points, 6)
  assert.equal(reloaded.pointLedger.filter(entry => entry.sourceId === 'reading:bulk-book').length, 1)
  assert.equal(reloaded.pointLedger.filter(entry => entry.sourceId === 'memo:bulk-memo').length, 1)
})

test('ledger upsert is idempotent by sourceId and updates the existing award', () => {
  const first = upsertPointLedgerEntry([], {
    id: 'entry-1',
    sourceType: 'todo',
    sourceId: 'todo:task-1',
    title: 'Task',
    account: 'effort',
    points: 10,
    occurredAt: timestamp,
  })
  const second = upsertPointLedgerEntry(first, {
    id: 'entry-2',
    sourceType: 'todo',
    sourceId: 'todo:task-1',
    title: 'Task edited',
    account: 'rest',
    points: 12,
    occurredAt: timestamp,
  })

  assert.equal(second.length, 1)
  assert.equal(second[0].id, 'entry-2')
  assert.equal(second[0].points, 12)
  assert.deepEqual(getPointBalances(second), { effort: 0, rest: 12, total: 12 })
})

test('only manual adjustments can be negative and invalid numbers become zero', () => {
  const ledger = normalizePointLedger([
    {
      id: 'bad-todo',
      sourceType: 'todo',
      sourceId: 'todo:bad',
      title: 'Bad todo',
      account: 'effort',
      points: -4,
      occurredAt: timestamp,
    },
    {
      id: 'manual',
      sourceType: 'manual-adjustment',
      sourceId: 'manual:correction',
      title: 'Correction',
      account: 'rest',
      points: -3.8,
      occurredAt: timestamp,
      reason: 'correction',
    },
    {
      id: 'nan',
      sourceType: 'memo',
      sourceId: 'memo:nan',
      title: 'Invalid',
      account: 'effort',
      points: Number.NaN,
      occurredAt: timestamp,
    },
  ], timestamp)

  assert.equal(ledger[0].points, 0)
  assert.equal(ledger[1].points, -3)
  assert.equal(ledger[2].points, 0)
  assert.deepEqual(getPointBalances(ledger), { effort: 0, rest: -3, total: -3 })
})

test('legacy migration preserves saved points and repeated normalization does not increase them', () => {
  const legacy = {
    todos: [],
    earnedPoints: 20,
    archivedPointHistory: [],
    pendingPointHistory: [],
    hiddenPointHistoryIds: [],
    studyBooks: [{
      id: 'legacy-book',
      title: 'Legacy book',
      category: 'bunko' as const,
      pageCount: 2,
      createdAt: timestamp,
      points: 999,
    }],
    notebookMemos: [{
      id: 'legacy-memo',
      title: 'Legacy memo',
      content: '12345678901234567890',
      color: '#fff',
      createdAt: timestamp,
      points: 999,
    }],
    characterShop: {
      spentPoints: 5,
      outfit: 'legacy-outfit',
      activeItem: 'legacy-item',
      ownedItems: ['legacy-outfit', 'legacy-item'],
    },
  }

  const migrated = normalizeTodoSession(legacy, timestamp)
  const normalizedAgain = normalizeTodoSession(migrated, timestamp)

  assert.equal(migrated.studyBooks[0].points, 999)
  assert.equal(migrated.notebookMemos[0].points, 999)
  assert.equal(getPointBalances(migrated.pointLedger).total, 2018)
  assert.equal(getPointBalances(normalizedAgain.pointLedger).total, 2018)
  assert.equal(normalizedAgain.pointLedger.length, migrated.pointLedger.length)
  assert.equal(getAvailablePoints(normalizedAgain), 2013)
  assert.equal(normalizedAgain.characterShop.outfit, 'legacy-outfit')
  assert.deepEqual(normalizedAgain.characterShop.ownedItems.sort(), [
    'legacy-item',
    'legacy-outfit',
    'none',
    'whiteSkirt',
  ])
})

test('migration preserves user-edited ledger accounts and points on repeated normalization', () => {
  const migrated = normalizeTodoSession({
    todos: [],
    earnedPoints: 10,
    archivedPointHistory: [{
      id: 'single-archived',
      title: 'Archived todo',
      type: 'single',
      points: 4,
      completedAt: timestamp,
    }],
    pendingPointHistory: [],
    hiddenPointHistoryIds: [],
    studyBooks: [{
      id: 'book-edited',
      title: 'Book',
      category: 'paper',
      pageCount: 4,
      createdAt: timestamp,
      points: 2,
    }],
    notebookMemos: [{
      id: 'memo-edited',
      title: 'Memo',
      content: 'x'.repeat(100),
      color: '#fff',
      createdAt: timestamp,
      points: 1,
    }],
    characterShop: {
      spentPoints: 0,
      outfit: 'whiteSkirt',
      activeItem: 'none',
      ownedItems: ['whiteSkirt', 'none'],
    },
    pointRules: DEFAULT_POINT_RULES,
    dailyReviews: [{
      id: 'review-edited',
      date: '2026-07-23',
      note: 'Review',
      completedAt: timestamp,
      awarded: true,
    }],
  }, timestamp)
  const editedPointsBySourceId: Record<string, number> = {
    'todo:single-archived': 40,
    'reading:book-edited': 30,
    'memo:memo-edited': 20,
    'review:2026-07-23': 10,
    'migration:legacy-earned-balance': -5,
  }
  const edited = {
    ...migrated,
    pointLedger: migrated.pointLedger.map(entry => ({
      ...entry,
      account: 'rest' as const,
      points: editedPointsBySourceId[entry.sourceId],
    })),
  }

  const normalizedAgain = normalizeTodoSession(edited, timestamp)

  assert.equal(normalizedAgain.pointLedger.length, migrated.pointLedger.length)
  assert.deepEqual(getPointBalances(normalizedAgain.pointLedger), {
    effort: 0,
    rest: 95,
    total: 95,
  })
  normalizedAgain.pointLedger.forEach(entry => {
    assert.equal(entry.account, 'rest')
    assert.equal(entry.points, editedPointsBySourceId[entry.sourceId])
  })

  const afterNewSources = normalizeTodoSession({
    ...normalizedAgain,
    earnedPoints: 15,
    archivedPointHistory: [
      ...normalizedAgain.archivedPointHistory,
      {
        id: 'single-new',
        title: 'New todo',
        type: 'single',
        points: 5,
        completedAt: timestamp,
      },
    ],
    studyBooks: [
      ...normalizedAgain.studyBooks,
      {
        id: 'book-new',
        title: 'New book',
        category: 'paper',
        pageCount: 4,
        createdAt: timestamp,
        points: 2,
      },
    ],
    notebookMemos: [
      ...normalizedAgain.notebookMemos,
      {
        id: 'memo-new',
        title: 'New memo',
        content: 'y'.repeat(100),
        color: '#fff',
        createdAt: timestamp,
        points: 1,
      },
    ],
    dailyReviews: [
      ...normalizedAgain.dailyReviews,
      {
        id: 'review-new',
        date: '2026-07-24',
        note: 'New review',
        completedAt: timestamp,
        awarded: true,
      },
    ],
  }, timestamp)

  assert.equal(afterNewSources.pointLedger.length, normalizedAgain.pointLedger.length + 4)
  assert.equal(
    afterNewSources.pointLedger.find(
      entry => entry.sourceId === 'migration:legacy-earned-balance'
    )?.points,
    -5
  )
  assert.equal(
    afterNewSources.pointLedger.find(entry => entry.sourceId === 'todo:single-new')?.points,
    5
  )
  assert.deepEqual(getPointBalances(afterNewSources.pointLedger), {
    effort: 11,
    rest: 95,
    total: 106,
  })
})

test('legacy daily review ledger sources migrate by original review id without double awarding', () => {
  const completedLater = '2026-07-30T03:00:00.000Z'
  const migrated = normalizeTodoSession({
    todos: [],
    earnedPoints: 0,
    archivedPointHistory: [],
    pendingPointHistory: [],
    hiddenPointHistoryIds: [],
    studyBooks: [],
    notebookMemos: [],
    pointRules: DEFAULT_POINT_RULES,
    dailyReviews: [
      { id: 'legacy-review-one', date: '2026-07-21', note: 'one', completedAt: completedLater, awarded: true },
      { id: 'legacy-review-two', date: '2026-07-22', note: 'two', completedAt: completedLater, awarded: true },
    ],
    pointLedger: [
      {
        id: 'legacy-ledger-one', sourceType: 'review', sourceId: 'review:legacy-review-one',
        title: 'Edited one', account: 'rest', points: 7, occurredAt: completedLater,
      },
      {
        id: 'legacy-ledger-two', sourceType: 'review', sourceId: 'review:legacy-review-two',
        title: 'Edited two', account: 'effort', points: 11, occurredAt: completedLater,
      },
    ],
  }, timestamp)

  assert.deepEqual(migrated.dailyReviews.map(review => [review.id, review.date]), [
    ['daily-review:2026-07-21', '2026-07-21'],
    ['daily-review:2026-07-22', '2026-07-22'],
  ])
  assert.deepEqual(migrated.pointLedger.map(entry => ({
    id: entry.id,
    sourceId: entry.sourceId,
    account: entry.account,
    points: entry.points,
    occurredAt: entry.occurredAt,
  })), [
    { id: 'legacy-ledger-one', sourceId: 'review:2026-07-21', account: 'rest', points: 7, occurredAt: completedLater },
    { id: 'legacy-ledger-two', sourceId: 'review:2026-07-22', account: 'effort', points: 11, occurredAt: completedLater },
  ])
  assert.deepEqual(getPointBalances(migrated.pointLedger), { effort: 11, rest: 7, total: 18 })

  const normalizedAgain = normalizeTodoSession(JSON.parse(JSON.stringify(migrated)), timestamp)
  assert.deepEqual(normalizedAgain.pointLedger, migrated.pointLedger)
  assert.deepEqual(normalizedAgain.dailyReviews, migrated.dailyReviews)
})

test('new session fields normalize and survive a JSON and Supabase-compatible round trip', () => {
  const session = normalizeTodoSession({
    todos: [],
    earnedPoints: 0,
    archivedPointHistory: [],
    pendingPointHistory: [],
    hiddenPointHistoryIds: [],
    studyBooks: [],
    notebookMemos: [],
    characterShop: {
      spentPoints: 0,
      outfit: 'whiteSkirt',
      activeItem: 'none',
      ownedItems: ['whiteSkirt', 'none'],
    },
    pointRules: {
      ...DEFAULT_POINT_RULES,
      todoAccount: 'rest',
    },
    pointLedger: [{
      id: 'review-1',
      sourceType: 'review',
      sourceId: 'review:2026-07-23',
      title: 'Review',
      account: 'effort',
      points: 3,
      occurredAt: timestamp,
    }],
    taskCategories: [{ id: 'health', name: 'Health', account: 'rest', points: 5 }],
    taskPresets: [{ id: 'walk', title: 'Walk', categoryId: 'health', account: 'rest', points: 5 }],
    dailyReviews: [{ id: 'daily-1', date: '2026-07-23', note: 'Done', completedAt: timestamp, awarded: true }],
  }, timestamp)
  const roundTripped = normalizeTodoSession(JSON.parse(JSON.stringify(session)), timestamp)

  assert.equal(roundTripped.pointRules.todoAccount, 'rest')
  assert.equal(roundTripped.taskCategories[0].account, 'rest')
  assert.equal(roundTripped.taskPresets[0].categoryId, 'health')
  assert.equal(roundTripped.dailyReviews[0].awarded, true)
  assert.equal(roundTripped.pointLedger.filter(item => item.sourceId === 'review:2026-07-23').length, 1)
  assert.equal(getPointLedgerByDate(roundTripped.pointLedger)['2026-07-23'].length, 1)
})

test('daily review normalization migrates legacy notes, deduplicates date and selections', () => {
  const reviews = normalizeDailyReviews([
    { id: 'legacy-a', date: '2026-07-23', note: 'よかった', completedAt: timestamp, awarded: true },
    {
      id: 'legacy-b', date: '2026-07-23', note: '', awarded: false,
      hanamaruSourceIds: ['todo:a', 'todo:a', 'memo:b'],
      selfEvaluationTags: ['よく頑張った', 'よく頑張った'],
    },
    { id: 'broken', date: 'not-a-date', note: 'fallback', awarded: false },
    { id: 'broken-calendar', date: '2026-99-99', note: '', awarded: false },
  ], '2026-07-25T10:00:00.000Z')
  assert.equal(reviews.length, 2)
  assert.equal(reviews[0].id, 'daily-review:2026-07-23')
  assert.equal(reviews[0].goodThings, 'よかった')
  assert.deepEqual(reviews[0].hanamaruSourceIds, ['todo:a', 'memo:b'])
  assert.deepEqual(reviews[0].selfEvaluationTags, ['よく頑張った'])
  assert.equal(reviews[0].awarded, true)
  assert.equal(reviews[1].date, '2026-07-25')
})

test('daily review upsert is date-unique and toggles values without duplicates', () => {
  const first = upsertDailyReview([], { date: '2026-07-24', goodThings: 'first' }, timestamp)
  const second = upsertDailyReview(first, {
    date: '2026-07-24',
    goodThings: 'edited',
    hanamaruSourceIds: toggleDailyReviewValue([], 'todo:one'),
    selfEvaluationTags: toggleDailyReviewValue(['ちゃんと休めた'], 'ちゃんと休めた'),
  }, timestamp)
  assert.equal(second.length, 1)
  assert.equal(second[0].goodThings, 'edited')
  assert.deepEqual(second[0].hanamaruSourceIds, ['todo:one'])
  assert.deepEqual(second[0].selfEvaluationTags, [])
  assert.deepEqual(toggleDailyReviewValue(['todo:one'], 'todo:one'), [])
})

test('review outcomes aggregate todo, reading and memo once at the local date boundary', () => {
  const localTimestamp = '2026-07-23T23:30:00-07:00'
  const date = getTodoDateKey(localTimestamp)
  const session = normalizeTodoSession({
    todos: [{ type: 'single', data: { id: 'boundary', text: 'Boundary todo', difficulty: 'easy', completed: true, createdAt: timestamp, completedAt: localTimestamp } }],
    archivedPointHistory: [{ id: 'single-boundary', title: 'Duplicate archive', type: 'single', points: 10, account: 'effort', sourceId: 'todo:single-boundary', completedAt: localTimestamp }],
    pendingPointHistory: [],
    studyBooks: [{ id: 'book-day', title: 'Book', category: 'bunko', pageCount: 10, createdAt: localTimestamp, points: 1, pointAccount: 'rest' }],
    notebookMemos: [{ id: 'memo-day', title: 'Memo', content: 'memo', color: '#fff', createdAt: localTimestamp, points: 1, pointAccount: 'effort' }],
  }, timestamp)
  const outcomes = getReviewOutcomesForDate(session, date)
  assert.equal(outcomes.filter(item => item.sourceId === 'todo:single-boundary').length, 1)
  assert.deepEqual(outcomes.map(item => item.type).sort(), ['memo', 'reading', 'todo'])
  assert.equal(getReviewOutcomesForDate(session, '2026-01-01').length, 0)
})

test('review draft saves without points and first completion awards only once', () => {
  const session = normalizeTodoSession({ todos: [], pointLedger: [], dailyReviews: [] }, timestamp)
  const draft = saveDailyReviewDraft(session, '2026-07-23', {
    goodThings: 'draft', hanamaruSourceIds: ['todo:a'], selfEvaluationTags: ['よく頑張った'],
  }, timestamp)
  assert.equal(draft.pointLedger.filter(item => item.sourceType === 'review').length, 0)
  const completed = completeDailyReview(draft, '2026-07-23', {}, timestamp)
  const savedAgain = completeDailyReview(completed, '2026-07-23', { tomorrowNote: 'edited' }, '2026-07-23T12:00:00.000Z')
  assert.equal(savedAgain.dailyReviews.length, 1)
  assert.equal(savedAgain.dailyReviews[0].tomorrowNote, 'edited')
  assert.equal(savedAgain.pointLedger.filter(item => item.sourceId === 'review:2026-07-23').length, 1)
  assert.equal(savedAgain.pointLedger.find(item => item.sourceId === 'review:2026-07-23')?.points, 3)
  assert.equal(getDailyReviewSummary(savedAgain, '2026-07-23').total, 3)
})

test('review completion supports zero points, rest account and an empty past day', () => {
  const session = normalizeTodoSession({
    todos: [], pointRules: { ...DEFAULT_POINT_RULES, reviewAccount: 'rest', reviewPoints: 0 },
  }, timestamp)
  const completed = completeDailyReview(session, '2026-06-01', {}, timestamp)
  const award = completed.pointLedger.find(item => item.sourceId === 'review:2026-06-01')
  assert.equal(award?.account, 'rest')
  assert.equal(award?.points, 0)
  assert.equal(completed.dailyReviews[0].awarded, true)
  assert.deepEqual(getDailyReviewSummary(completed, '2026-06-01').todoCount, 0)
  assert.equal(getDailyReviewSummary(completed, '2026-06-01').rest, 0)
})

test('an existing edited review ledger is preserved on completion and reload', () => {
  const session = normalizeTodoSession({
    todos: [],
    pointRules: { ...DEFAULT_POINT_RULES, reviewAccount: 'effort', reviewPoints: 3 },
    pointLedger: [{
      id: 'edited-review', sourceType: 'review', sourceId: 'review:2026-07-23', title: 'Edited',
      account: 'rest', points: 12, occurredAt: timestamp,
    }],
    dailyReviews: [{ id: 'old', date: '2026-07-23', note: '', awarded: false }],
  }, timestamp)
  const completed = completeDailyReview(session, '2026-07-23', {}, timestamp)
  const reloaded = normalizeTodoSession(JSON.parse(JSON.stringify(completed)), timestamp)
  const awards = reloaded.pointLedger.filter(item => item.sourceType === 'review')
  assert.equal(awards.length, 1)
  assert.equal(awards[0].account, 'rest')
  assert.equal(awards[0].points, 12)
})

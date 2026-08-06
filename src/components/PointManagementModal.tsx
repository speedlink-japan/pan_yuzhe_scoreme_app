'use client'

import React, { useMemo, useState } from 'react'
import styles from './PointManagementModal.module.css'
import {
  PointAccount,
  PointLedgerEntry,
  TaskCategory,
  TodoSession,
  getAvailablePoints,
  getTodoDateKey,
  getTodoTimestamp,
  normalizeTodoSession,
} from '@/utils/todoSession'
import {
  createManualAdjustment,
  getPointBalances,
  updatePointLedgerEntries,
  upsertPointLedgerEntry,
} from '@/utils/pointLedger'
import { persistTodoSession } from '@/utils/todoSupabaseSync'

const readSession = () => {
  try {
    const raw = window.localStorage.getItem('myscore.todo.session.v1')
    return normalizeTodoSession(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeTodoSession(null)
  }
}

const accountLabel = (account: PointAccount) => account === 'effort' ? '頑張り' : '休憩'
const sourceLabels: Record<PointLedgerEntry['sourceType'], string> = {
  todo: 'Todo', reading: '読書', memo: 'メモ', review: '見直し', 'manual-adjustment': '手動調整',
}

export default function PointManagementModal({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState<TodoSession>(() => readSession())
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [bulkAccount, setBulkAccount] = useState<'' | PointAccount>('')
  const [bulkPoints, setBulkPoints] = useState('')
  const [manualAccount, setManualAccount] = useState<PointAccount>('effort')
  const [manualPoints, setManualPoints] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryAccount, setCategoryAccount] = useState<PointAccount>('effort')
  const [categoryPoints, setCategoryPoints] = useState('10')

  const balances = getPointBalances(session.pointLedger)
  const filteredLedger = useMemo(() => session.pointLedger
    .filter(entry => !dateFilter || getTodoDateKey(entry.occurredAt) === dateFilter)
    .filter(entry => !sourceFilter || entry.sourceType === sourceFilter)
    .filter(entry => !accountFilter || entry.account === accountFilter)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [session.pointLedger, dateFilter, sourceFilter, accountFilter])

  const commit = (nextValue: TodoSession) => {
    const next = normalizeTodoSession(nextValue)
    setSession(next)
    void persistTodoSession(next, getTodoTimestamp()).catch(() => window.alert('保存に失敗した。'))
    window.dispatchEvent(new CustomEvent('todo-session-external-update', { detail: next }))
  }

  const applyBulkUpdate = () => {
    if (selectedIds.length === 0 || (!bulkAccount && bulkPoints === '')) return
    if (!window.confirm(`${selectedIds.length}件の過去履歴を一括変更する？`)) return
    commit({
      ...session,
      pointLedger: updatePointLedgerEntries(session.pointLedger, selectedIds, {
        account: bulkAccount || undefined,
        points: bulkPoints === '' ? undefined : Math.max(0, Math.trunc(Number(bulkPoints))),
      }),
    })
    setSelectedIds([])
    setBulkAccount('')
    setBulkPoints('')
  }

  const addManual = () => {
    if (manualPoints === '' || !manualReason.trim() || !Number.isInteger(Number(manualPoints))) return
    const entry = createManualAdjustment(manualAccount, Number(manualPoints), manualReason)
    commit({ ...session, pointLedger: upsertPointLedgerEntry(session.pointLedger, entry) })
    setManualPoints('')
    setManualReason('')
  }

  const addCategory = () => {
    if (!categoryName.trim() || !Number.isInteger(Number(categoryPoints))) return
    const category: TaskCategory = {
      id: crypto.randomUUID(), name: categoryName.trim(), account: categoryAccount,
      points: Math.max(0, Number(categoryPoints)),
    }
    commit({ ...session, taskCategories: [...session.taskCategories, category] })
    setCategoryName('')
  }

  const updateCategory = (id: string, changes: Partial<TaskCategory>) => commit({
    ...session,
    taskCategories: session.taskCategories.map(category => category.id === id ? { ...category, ...changes } : category),
  })

  const updatePreset = (id: string, changes: Partial<TodoSession['taskPresets'][number]>) => commit({
    ...session,
    taskPresets: session.taskPresets.map(preset => preset.id === id ? { ...preset, ...changes } : preset),
  })

  const deleteCategory = (id: string) => {
    if (!window.confirm('このカテゴリを削除する？既存Todoは「カテゴリなし」になる。')) return
    commit({
      ...session,
      taskCategories: session.taskCategories.filter(category => category.id !== id),
      taskPresets: session.taskPresets.map(preset => preset.categoryId === id ? { ...preset, categoryId: undefined } : preset),
      todos: session.todos.map(todo => todo.data.categoryId === id
        ? { ...todo, data: { ...todo.data, categoryId: undefined } } as typeof todo
        : todo),
    })
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="ポイント管理">
        <header className={styles.header}><div><h2>ポイント管理</h2><p>過去履歴と、これからの獲得ルールを分けて管理する。</p></div><button onClick={onClose} aria-label="閉じる">×</button></header>
        <div className={styles.body}>
          <section>
            <h3>残高</h3>
            <div className={styles.balanceGrid}>
              <div><span>頑張り</span><strong>{balances.effort}pt</strong></div>
              <div><span>休憩</span><strong>{balances.rest}pt</strong></div>
              <div><span>合計</span><strong>{balances.total}pt</strong></div>
              <div><span>利用可能合計</span><strong>{getAvailablePoints(session)}pt</strong></div>
            </div>
          </section>

          <section>
            <h3>獲得履歴</h3>
            <div className={styles.filters}>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} aria-label="日付で絞り込み" />
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} aria-label="獲得元で絞り込み"><option value="">獲得元：すべて</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} aria-label="口座で絞り込み"><option value="">口座：すべて</option><option value="effort">頑張り</option><option value="rest">休憩</option></select>
            </div>
            <div className={styles.historyList}>
              {filteredLedger.map(entry => <label key={entry.id} className={styles.historyRow}>
                <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, entry.id] : ids.filter(id => id !== entry.id))} />
                <span className={styles.historyMain}><strong>{entry.title || sourceLabels[entry.sourceType]}</strong><small>{getTodoDateKey(entry.occurredAt)}・{sourceLabels[entry.sourceType]}{entry.reason ? `・${entry.reason}` : ''}</small></span>
                <span className={styles.accountBadge}>{accountLabel(entry.account)}</span><strong className={entry.points < 0 ? styles.negative : ''}>{entry.points}pt</strong>
              </label>)}
              {filteredLedger.length === 0 && <p className={styles.empty}>該当する履歴はない。</p>}
            </div>
            <div className={styles.actionBox}><strong>選択中 {selectedIds.length}件</strong><select value={bulkAccount} onChange={e => setBulkAccount(e.target.value as '' | PointAccount)}><option value="">口座は変更しない</option><option value="effort">頑張りへ変更</option><option value="rest">休憩へ変更</option></select><input type="number" min="0" step="1" value={bulkPoints} onChange={e => setBulkPoints(e.target.value)} placeholder="ポイントは変更しない" /><button onClick={applyBulkUpdate}>一括変更</button></div>
          </section>

          <section><h3>手動調整</h3><div className={styles.actionBox}><select value={manualAccount} onChange={e => setManualAccount(e.target.value as PointAccount)}><option value="effort">頑張り</option><option value="rest">休憩</option></select><input type="number" step="1" value={manualPoints} onChange={e => setManualPoints(e.target.value)} placeholder="整数（負数可）" /><input value={manualReason} onChange={e => setManualReason(e.target.value)} placeholder="理由（必須）" /><button onClick={addManual} disabled={!manualReason.trim() || manualPoints === ''}>調整を追加</button></div></section>

          <section><h3>Todoルール</h3><div className={styles.ruleRow}><label>Todo初期口座<select value={session.pointRules.todoAccount} onChange={e => commit({ ...session, pointRules: { ...session.pointRules, todoAccount: e.target.value as PointAccount } })}><option value="effort">頑張り</option><option value="rest">休憩</option></select></label></div>
            <h4>カテゴリ</h4><div className={styles.categoryList}>{session.taskCategories.map(category => <div key={category.id} className={styles.categoryRow}><input value={category.name} onChange={e => updateCategory(category.id, { name: e.target.value })} /><select value={category.account} onChange={e => updateCategory(category.id, { account: e.target.value as PointAccount })}><option value="effort">頑張り</option><option value="rest">休憩</option></select><input type="number" min="0" step="1" value={category.points} onChange={e => updateCategory(category.id, { points: Math.max(0, Math.trunc(Number(e.target.value))) })} /><button className={styles.danger} onClick={() => deleteCategory(category.id)}>削除</button></div>)}</div>
            <div className={styles.actionBox}><input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="新しいカテゴリ名" /><select value={categoryAccount} onChange={e => setCategoryAccount(e.target.value as PointAccount)}><option value="effort">頑張り</option><option value="rest">休憩</option></select><input type="number" min="0" step="1" value={categoryPoints} onChange={e => setCategoryPoints(e.target.value)} /><button onClick={addCategory}>カテゴリ追加</button></div>
            <h4>プリセット</h4><div className={styles.presetRules}>{session.taskPresets.map(preset => <div key={preset.id}>
              <input aria-label="プリセット名" value={preset.title} onChange={e => updatePreset(preset.id, { title: e.target.value })} />
              <select aria-label="プリセットのカテゴリ" value={preset.categoryId ?? ''} onChange={e => updatePreset(preset.id, { categoryId: e.target.value || undefined })}><option value="">カテゴリなし</option>{session.taskCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <select aria-label="プリセットの口座" value={preset.account ?? ''} onChange={e => updatePreset(preset.id, { account: (e.target.value || undefined) as PointAccount | undefined })}><option value="">口座はルールに従う</option><option value="effort">頑張り</option><option value="rest">休憩</option></select>
              <input aria-label="プリセットのポイント" type="number" min="0" step="1" value={preset.points ?? ''} placeholder="ルールに従う" onChange={e => updatePreset(preset.id, { points: e.target.value === '' ? undefined : Math.max(0, Math.trunc(Number(e.target.value))) })} />
              <button className={styles.danger} onClick={() => window.confirm('このプリセットを削除する？') && commit({ ...session, taskPresets: session.taskPresets.filter(item => item.id !== preset.id) })}>削除</button>
            </div>)}</div>
          </section>
        </div>
      </section>
    </div>
  )
}

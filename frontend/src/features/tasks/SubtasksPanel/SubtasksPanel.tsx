import React, { useState } from 'react'
import type { Task } from '@/types'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import {
    TASK_STATUS,
    PRIORITY_COLORS,
    getCompletionBlockReason,
    getMemberName,
} from '@/utils/tasksUtils'
import './SubtasksPanel.scss'

interface SubtasksPanelProps {
    root: Task
    subtasks: Task[]
    activeId: number
    isLoading?: boolean
    canAdd?: boolean
    onSelect: (id: number) => void
    onToggle: (subtask: Task) => void
    onAdd: (title: string) => Promise<void>
}

/** Правая колонка карточки задачи: основная задача + список подзадач */
export const SubtasksPanel: React.FC<SubtasksPanelProps> = ({
    root,
    subtasks,
    activeId,
    isLoading = false,
    canAdd = true,
    onSelect,
    onToggle,
    onAdd,
}) => {
    const [title, setTitle] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    const done = subtasks.filter(s => s.status === TASK_STATUS.COMPLETED).length
    const total = subtasks.length
    const progress = total ? Math.round((done / total) * 100) : 0

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        const value = title.trim()
        if (!value || isAdding) return
        setIsAdding(true)
        try {
            await onAdd(value)
            setTitle('')
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <aside className="subtasks-panel">
            <button
                type="button"
                className={`subtasks-panel__root ${activeId === root.id ? 'subtasks-panel__root--active' : ''}`}
                onClick={() => onSelect(root.id)}
            >
                <span className="subtasks-panel__root-label">Основная задача</span>
                <span className="subtasks-panel__root-title">{root.title}</span>
            </button>

            <header className="subtasks-panel__header">
                <h3 className="subtasks-panel__title">Подзадачи</h3>
                {total > 0 && (
                    <span className="subtasks-panel__count">{done}/{total}</span>
                )}
            </header>

            {total > 0 && (
                <div
                    className="subtasks-panel__progress"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <span style={{ width: `${progress}%` }} />
                </div>
            )}

            <ul className="subtasks-panel__list">
                {isLoading && <li className="subtasks-panel__empty">Загрузка…</li>}
                {!isLoading && total === 0 && (
                    <li className="subtasks-panel__empty">
                        Разбейте задачу на шаги. Когда выполните последний, задача закроется сама.
                    </li>
                )}
                {subtasks.map((subtask, index) => {
                    const completed = subtask.status === TASK_STATUS.COMPLETED
                    const blockReason = getCompletionBlockReason(subtask)
                    const assignee = subtask.assignees[0]
                    return (
                        <li
                            key={subtask.id}
                            className={[
                                'subtasks-panel__item',
                                completed && 'subtasks-panel__item--completed',
                                activeId === subtask.id && 'subtasks-panel__item--active',
                            ].filter(Boolean).join(' ')}
                            style={{ '--task-accent': PRIORITY_COLORS[subtask.priority] } as React.CSSProperties}
                        >
                            <button
                                type="button"
                                className={`subtasks-panel__check ${completed ? 'subtasks-panel__check--checked' : ''}`}
                                onClick={() => onToggle(subtask)}
                                disabled={Boolean(blockReason)}
                                title={blockReason ?? (completed ? 'Вернуть в работу' : 'Отметить выполненной')}
                                aria-label={completed ? 'Вернуть в работу' : 'Отметить выполненной'}
                            >
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle cx="12" cy="12" r="8" strokeWidth="2" />
                                    <path d="M8 12L11 15L16 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                className="subtasks-panel__open"
                                onClick={() => onSelect(subtask.id)}
                            >
                                <span className="subtasks-panel__index">{index + 1}.</span>
                                <span className="subtasks-panel__item-title">{subtask.title}</span>
                                {assignee && (
                                    <Avatar user={assignee} size="xs" title={getMemberName(assignee)} />
                                )}
                            </button>
                        </li>
                    )
                })}
            </ul>

            {canAdd && (
                <form className="subtasks-panel__add" onSubmit={handleAdd}>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Новая подзадача"
                        maxLength={200}
                        disabled={isAdding}
                    />
                    <button
                        type="submit"
                        className="subtasks-panel__add-btn"
                        disabled={!title.trim() || isAdding}
                        aria-label="Добавить подзадачу"
                        title="Добавить подзадачу"
                    >
                        +
                    </button>
                </form>
            )}
        </aside>
    )
}

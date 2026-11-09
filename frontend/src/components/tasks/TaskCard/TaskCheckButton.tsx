import React from 'react'
import type { Task } from '@/types'
import { TASK_STATUS, getCompletionBlockReason } from '@/utils/tasksUtils'
import './TaskCard.scss'

interface TaskCheckButtonProps {
    task: Task
    canComplete?: boolean
    onToggle?: (task: Task) => void
}

/** Круглый чекбокс выполнения задачи: сам знает, когда переключать статус нельзя */
export const TaskCheckButton: React.FC<TaskCheckButtonProps> = ({
    task,
    canComplete = true,
    onToggle,
}) => {
    const isCompleted = task.status === TASK_STATUS.COMPLETED
    const blockReason = getCompletionBlockReason(task)

    return (
        <button
            type="button"
            className={`task-card__check ${isCompleted ? 'task-card__check--checked' : ''}`}
            onClick={(e) => {
                e.stopPropagation()
                onToggle?.(task)
            }}
            disabled={!canComplete || Boolean(blockReason)}
            aria-label={isCompleted ? 'Вернуть в активные' : 'Завершить задачу'}
            title={blockReason ?? (isCompleted ? 'Вернуть в активные' : 'Отметить выполненной')}
        >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="task-card__check-circle" cx="12" cy="12" r="8" strokeWidth="2" />
                <path
                    className="task-card__check-mark"
                    d="M8 12L11 15L16 9"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    )
}

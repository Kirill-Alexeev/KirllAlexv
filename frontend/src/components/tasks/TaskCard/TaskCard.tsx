import React from 'react'
import type { Task } from '@/types'
import {
    TASK_STATUS,
    PRIORITY_COLORS,
    formatShortDate,
    getEffectiveDate,
} from '@/utils/tasksUtils'
import calendarIcon from '@/assets/icons/calendar.svg'
import './TaskCard.scss'

interface TaskCardProps {
    task: Task
    detailed?: boolean
    canComplete?: boolean
    canManage?: boolean
    onToggleStatus?: (task: Task) => void
    onClick?: (task: Task) => void
}

export const TaskCard: React.FC<TaskCardProps> = ({
    task,
    detailed = false,
    canComplete = true,
    canManage = true,
    onToggleStatus,
    onClick,
}) => {
    const isCompleted = task.status === TASK_STATUS.COMPLETED
    const accent = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[1]
    const date = getEffectiveDate(task) || task.due_date || task.deadline

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (canComplete && onToggleStatus) onToggleStatus(task)
    }

    return (
        <article
            className={`task-card ${isCompleted ? 'task-card--completed' : ''} ${detailed ? 'task-card--detailed' : ''}`}
            style={{ '--task-accent': accent } as React.CSSProperties}
            onClick={() => canManage && onClick?.(task)}
            role={canManage ? 'button' : undefined}
            tabIndex={canManage ? 0 : undefined}
            onKeyDown={(e) => {
                if (canManage && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onClick?.(task)
                }
            }}
        >
            <div className="task-card__accent" />

            <div className="task-card__body">
                <div className="task-card__header">
                    <button
                        type="button"
                        className={`task-card__check ${isCompleted ? 'task-card__check--checked' : ''}`}
                        onClick={handleToggle}
                        disabled={!canComplete}
                        aria-label={isCompleted ? 'Вернуть в активные' : 'Завершить задачу'}
                        title={isCompleted ? 'Вернуть в активные' : 'Отметить выполненной'}
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
                    <h3 className="task-card__title">{task.title}</h3>
                </div>

                {task.description && (
                    <p className="task-card__description">{task.description}</p>
                )}

                {detailed && task.assignees.length > 0 && (
                    <div className="task-card__assignees">
                        {task.assignees.map(user => (
                            <span key={user.id} className="task-card__assignee">
                                {user.first_name || user.username}
                            </span>
                        ))}
                    </div>
                )}

                <div className="task-card__meta">
                    {date && (
                        <span className="task-card__meta-item">
                            <img src={calendarIcon} alt="" />
                            {formatShortDate(date)}
                        </span>
                    )}
                    {task.tags
                        .filter(tag => tag && tag.title)
                        .map(tag => (
                            <span key={tag.id} className="task-card__meta-item task-card__tag">
                                #{tag.title}
                            </span>
                        ))}
                </div>
            </div>
        </article>
    )
}

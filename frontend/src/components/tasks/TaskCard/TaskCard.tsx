import React from 'react'
import type { Task } from '@/types'
import {
    TASK_STATUS,
    PRIORITY_COLORS,
    formatShortDate,
    getEffectiveDate,
} from '@/utils/tasksUtils'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import { TaskCheckButton } from './TaskCheckButton'
import { getMemberName } from '@/utils/tasksUtils'
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
    const [mainAssignee, ...otherAssignees] = task.assignees ?? []
    const commentsCount = task.comments_count ?? 0
    const unreadCount = task.unread_comments_count ?? 0
    const showComments = Boolean(task.workspace) && commentsCount > 0
    const subtasksTotal = task.subtasks_count ?? 0
    const subtasksDone = task.completed_subtasks_count ?? 0

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
                    <TaskCheckButton task={task} canComplete={canComplete} onToggle={onToggleStatus} />
                    <h3 className="task-card__title">{task.title}</h3>
                    {unreadCount > 0 && (
                        <span
                            className="task-card__unread"
                            title={`Новые комментарии: ${unreadCount}`}
                            aria-label={`Новые комментарии: ${unreadCount}`}
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>

                {task.description && (
                    <p className="task-card__description">{task.description}</p>
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
                    {subtasksTotal > 0 && (
                        <span
                            className={`task-card__meta-item task-card__subtasks ${subtasksDone === subtasksTotal ? 'task-card__subtasks--done' : ''}`}
                            title={`Подзадачи: выполнено ${subtasksDone} из ${subtasksTotal}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M9 6h11M9 12h11M9 18h11" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {subtasksDone}/{subtasksTotal}
                        </span>
                    )}
                    {showComments && (
                        <span
                            className={`task-card__meta-item task-card__comments ${unreadCount > 0 ? 'task-card__comments--unread' : ''}`}
                            title={`Комментарии: ${commentsCount}`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                    d="M20 12c0 3.87-3.58 7-8 7-1.2 0-2.34-.23-3.36-.65L4 20l1.3-3.9C4.48 14.93 4 13.52 4 12c0-3.87 3.58-7 8-7s8 3.13 8 7Z"
                                    strokeWidth="1.8"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            {commentsCount}
                        </span>
                    )}
                </div>

                {mainAssignee && (
                    <div className="task-card__assignee" title={task.assignees.map(getMemberName).join(', ')}>
                        <Avatar user={mainAssignee} size="xs" />
                        <span className="task-card__assignee-name">{getMemberName(mainAssignee)}</span>
                        {otherAssignees.length > 0 && (
                            <span className="task-card__assignee-more">+{otherAssignees.length}</span>
                        )}
                    </div>
                )}
            </div>
        </article>
    )
}

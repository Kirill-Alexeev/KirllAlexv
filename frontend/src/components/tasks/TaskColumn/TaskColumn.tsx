import React from 'react'
import type { Task } from '@/types'
import { TaskCard } from '../TaskCard/TaskCard'
import addIcon from '@/assets/icons/add.svg'
import './TaskColumn.scss'

interface TaskColumnProps {
    title: string
    tasks: Task[]
    isOverdue?: boolean
    detailed?: boolean
    canAdd?: boolean
    compactAdd?: boolean
    canComplete?: (task: Task) => boolean
    canManage?: (task: Task) => boolean
    onAdd?: () => void
    onToggleStatus?: (task: Task) => void
    onTaskClick?: (task: Task) => void
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
    title,
    tasks,
    isOverdue = false,
    detailed = false,
    canAdd = true,
    compactAdd = false,
    canComplete,
    canManage,
    onAdd,
    onToggleStatus,
    onTaskClick,
}) => {
    return (
        <section className={`task-column ${isOverdue ? 'task-column--overdue' : ''}`}>
            <header className="task-column__header">
                <h2 className="task-column__title">{title}</h2>
                <span className="task-column__count">{tasks.length}</span>
            </header>

            <div className="task-column__list">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        detailed={detailed}
                        canComplete={canComplete ? canComplete(task) : true}
                        canManage={canManage ? canManage(task) : true}
                        onToggleStatus={onToggleStatus}
                        onClick={onTaskClick}
                    />
                ))}
            </div>

            {canAdd && (
                <button
                    type="button"
                    className={`task-column__add ${compactAdd ? 'task-column__add--compact' : ''}`}
                    onClick={onAdd}
                    aria-label="Добавить задачу"
                    title={compactAdd ? 'Добавить задачу' : undefined}
                >
                    <img src={addIcon} alt="" />
                    {!compactAdd && <span>Добавить задачу</span>}
                </button>
            )}
        </section>
    )
}

import React from 'react'
import type { Task } from '@/types'
import { TaskCard } from '@/components/tasks/TaskCard/TaskCard'
import { EmptyState } from '@/components/tasks/EmptyState/EmptyState'
import { isTaskToday, isTaskOverdue, TASK_STATUS, toIso, today } from '@/utils/tasksUtils'
import addIcon from '@/assets/icons/add.svg'
import './TodayView.scss'

interface TodayViewProps {
    tasks: Task[]
    canAdd?: boolean
    canComplete?: (task: Task) => boolean
    canManage?: (task: Task) => boolean
    onAdd: () => void
    onToggleStatus: (task: Task) => void
    onTaskClick: (task: Task) => void
}

export const TodayView: React.FC<TodayViewProps> = ({
    tasks,
    canAdd = true,
    canComplete,
    canManage,
    onAdd,
    onToggleStatus,
    onTaskClick,
}) => {
    const active = tasks.filter(t => t.status !== TASK_STATUS.COMPLETED)
    const todayTasks = active.filter(isTaskToday)
    const overdueTasks = active.filter(isTaskOverdue)
    const noDate = active.filter(t => !t.due_date && !t.deadline)

    const dateLabel = today().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    })

    if (!todayTasks.length && !overdueTasks.length && !noDate.length) {
        return (
            <EmptyState
                title="На сегодня задач нет"
                description="Добавьте задачу на сегодня или перенесите из других дней"
                actionLabel={canAdd ? 'Добавить задачу' : undefined}
                onAction={canAdd ? onAdd : undefined}
            />
        )
    }

    return (
        <div className="today-view">
            <header className="today-view__header">
                <div>
                    <p className="today-view__eyebrow">{toIso(today())}</p>
                    <h2 className="today-view__title">
                        {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
                    </h2>
                </div>
                {canAdd && (
                    <button type="button" className="today-view__add" onClick={onAdd}>
                        <img src={addIcon} alt="" />
                        Добавить задачу
                    </button>
                )}
            </header>

            {overdueTasks.length > 0 && (
                <section className="today-view__section">
                    <h3 className="today-view__section-title today-view__section-title--danger">
                        Просрочено
                    </h3>
                    <div className="today-view__list">
                        {overdueTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                detailed
                                canComplete={canComplete ? canComplete(task) : true}
                                canManage={canManage ? canManage(task) : true}
                                onToggleStatus={onToggleStatus}
                                onClick={onTaskClick}
                            />
                        ))}
                    </div>
                </section>
            )}

            {todayTasks.length > 0 && (
                <section className="today-view__section">
                    <h3 className="today-view__section-title">На сегодня</h3>
                    <div className="today-view__list">
                        {todayTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                detailed
                                canComplete={canComplete ? canComplete(task) : true}
                                canManage={canManage ? canManage(task) : true}
                                onToggleStatus={onToggleStatus}
                                onClick={onTaskClick}
                            />
                        ))}
                    </div>
                </section>
            )}

            {noDate.length > 0 && (
                <section className="today-view__section">
                    <h3 className="today-view__section-title">Без срока</h3>
                    <div className="today-view__list">
                        {noDate.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                detailed
                                canComplete={canComplete ? canComplete(task) : true}
                                canManage={canManage ? canManage(task) : true}
                                onToggleStatus={onToggleStatus}
                                onClick={onTaskClick}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

import React from 'react'
import type { Task } from '@/types'
import { TaskColumn } from '@/components/tasks/TaskColumn/TaskColumn'
import { EmptyState } from '@/components/tasks/EmptyState/EmptyState'
import { groupTasksByDate } from '@/utils/tasksUtils'
import './AllTasksView.scss'

interface AllTasksViewProps {
    tasks: Task[]
    canAdd?: boolean
    canComplete?: (task: Task) => boolean
    canManage?: (task: Task) => boolean
    onAdd: (dueDate?: string | null) => void
    onToggleStatus: (task: Task) => void
    onTaskClick: (task: Task) => void
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({
    tasks,
    canAdd = true,
    canComplete,
    canManage,
    onAdd,
    onToggleStatus,
    onTaskClick,
}) => {
    const groups = groupTasksByDate(tasks)

    if (!groups.length) {
        return (
            <EmptyState
                title="Пока нет задач"
                description="Создайте первую задачу — она появится в колонке по дате"
                actionLabel={canAdd ? 'Добавить задачу' : undefined}
                onAction={canAdd ? () => onAdd(null) : undefined}
            />
        )
    }

    return (
        <div className="all-tasks-view">
            {groups.map((group, index) => (
                <TaskColumn
                    key={group.date ?? `${group.label}-${index}`}
                    title={group.label}
                    tasks={group.tasks}
                    isOverdue={group.isOverdue}
                    canAdd={canAdd}
                    canComplete={canComplete}
                    canManage={canManage}
                    onAdd={() => onAdd(group.date)}
                    onToggleStatus={onToggleStatus}
                    onTaskClick={onTaskClick}
                />
            ))}
        </div>
    )
}

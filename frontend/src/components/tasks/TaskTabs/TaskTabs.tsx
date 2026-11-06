import React from 'react'
import type { TaskViewMode } from '@/types'
import './TaskTabs.scss'

interface TabItem {
    id: TaskViewMode
    label: string
}

const TABS: TabItem[] = [
    { id: 'all', label: 'Все задачи' },
    { id: 'today', label: 'Сегодня' },
    { id: 'week', label: 'Неделя' },
    { id: 'completed', label: 'Выполнено' },
    { id: 'workspaces', label: 'Рабочие пространства' },
]

interface TaskTabsProps {
    active: TaskViewMode
    onChange: (mode: TaskViewMode) => void
}

export const TaskTabs: React.FC<TaskTabsProps> = ({ active, onChange }) => {
    return (
        <nav className="task-tabs" aria-label="Режимы просмотра задач">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    className={`task-tabs__item ${active === tab.id ? 'task-tabs__item--active' : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    )
}

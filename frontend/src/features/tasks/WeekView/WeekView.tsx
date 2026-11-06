import React, { useMemo, useState } from 'react'
import type { Task } from '@/types'
import { TaskColumn } from '@/components/tasks/TaskColumn/TaskColumn'
import {
    addDays,
    getWeekStart,
    groupTasksByWeek,
    toIso,
} from '@/utils/tasksUtils'
import './WeekView.scss'

interface WeekViewProps {
    tasks: Task[]
    canAdd?: boolean
    canComplete?: (task: Task) => boolean
    canManage?: (task: Task) => boolean
    onAdd: (dueDate?: string | null) => void
    onToggleStatus: (task: Task) => void
    onTaskClick: (task: Task) => void
}

export const WeekView: React.FC<WeekViewProps> = ({
    tasks,
    canAdd = true,
    canComplete,
    canManage,
    onAdd,
    onToggleStatus,
    onTaskClick,
}) => {
    const [weekStart, setWeekStart] = useState(() => getWeekStart())
    const weekEnd = addDays(weekStart, 6)
    const isCurrentWeek = toIso(weekStart) === toIso(getWeekStart())

    const groups = useMemo(() => groupTasksByWeek(tasks, weekStart), [tasks, weekStart])

    const formatRange = (start: Date, end: Date) => {
        const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
        return `${start.toLocaleDateString('ru-RU', opts)} — ${end.toLocaleDateString('ru-RU', opts)}`
    }

    return (
        <div className="week-view">
            <section className="week-view__week">
                <header className="week-view__week-header">
                    <div className="week-view__week-info">
                        <h3 className="week-view__week-title">
                            {isCurrentWeek ? 'Эта неделя' : 'Неделя'}
                        </h3>
                        <span className="week-view__week-range">
                            {formatRange(weekStart, weekEnd)}
                        </span>
                    </div>

                    <div className="week-view__nav">
                        <button
                            type="button"
                            className="week-view__nav-btn"
                            onClick={() => setWeekStart(addDays(weekStart, -7))}
                        >
                            ← Предыдущая неделя
                        </button>
                        {!isCurrentWeek && (
                            <button
                                type="button"
                                className="week-view__nav-btn"
                                onClick={() => setWeekStart(getWeekStart())}
                            >
                                Текущая
                            </button>
                        )}
                        <button
                            type="button"
                            className="week-view__nav-btn"
                            onClick={() => setWeekStart(addDays(weekStart, 7))}
                        >
                            Следующая неделя →
                        </button>
                    </div>
                </header>

                <div className="week-view__columns">
                    {groups.map(group => (
                        <TaskColumn
                            key={group.date}
                            title={group.label}
                            tasks={group.tasks}
                            canAdd={canAdd}
                            compactAdd
                            canComplete={canComplete}
                            canManage={canManage}
                            onAdd={() => onAdd(group.date)}
                            onToggleStatus={onToggleStatus}
                            onTaskClick={onTaskClick}
                        />
                    ))}
                </div>
            </section>
        </div>
    )
}

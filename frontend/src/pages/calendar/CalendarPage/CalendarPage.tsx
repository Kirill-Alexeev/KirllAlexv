import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/stores'
import type { CalendarOccurrence, Task } from '@/types'
import { tasksApi } from '@/api/tasks'
import { Header } from '@/components/Home/Header/Header'
import { Button } from '@/components/ui'
import { TaskCheckButton } from '@/components/tasks/TaskCard/TaskCheckButton'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal/CreateTaskModal'
import { EditTaskModal } from '@/features/tasks/EditTaskModal/EditTaskModal'
import { EventModal } from '@/features/calendar/EventModal/EventModal'
import { fetchCalendar } from '@/stores/calendar/calendarActions'
import { setCalendarRange } from '@/stores/calendar/calendarSlice'
import { changeTaskStatus, fetchTags } from '@/stores/tasks/tasksActions'
import { setTasks } from '@/stores/tasks/tasksSlice'
import { parseApiError } from '@/utils'
import {
    PRIORITY_COLORS,
    TASK_STATUS,
    getMemberName,
    toDate,
    toIso,
    today,
} from '@/utils/tasksUtils'
import './CalendarPage.scss'

const SHORT_WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MAX_CELL_EVENTS = 2

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const taskDate = (task: Task) => task.due_date ?? task.deadline

const isValidIso = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toDate(value).getTime())

const formatMonth = (month: Date) =>
    `${capitalize(month.toLocaleDateString('ru-RU', { month: 'long' }))} ${month.getFullYear()}`

const formatDay = (iso: string) =>
    capitalize(toDate(iso).toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }))

export const CalendarPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const [searchParams, setSearchParams] = useSearchParams()
    const tasks = useSelector((state: RootState) => state.tasks.tasks)
    const { events, error } = useSelector((state: RootState) => state.calendar)

    const [month, setMonth] = useState(() => firstOfMonth(today()))
    const [selected, setSelected] = useState(() => toIso(today()))
    const [createTaskOpen, setCreateTaskOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [assigneeOptions, setAssigneeOptions] = useState<{ id: number; label: string }[]>([])
    const [eventModal, setEventModal] = useState<{ event: CalendarOccurrence | null } | null>(null)
    const [actionError, setActionError] = useState('')

    const monthKey = toIso(month)
    useEffect(() => {
        const first = toDate(monthKey)
        const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
        dispatch(fetchCalendar({ from: toIso(first), to: toIso(last) }) as any)
    }, [dispatch, monthKey])

    useEffect(() => {
        dispatch(setTasks([]))
        return () => {
            dispatch(setCalendarRange(null))
            dispatch(setTasks([]))
        }
    }, [dispatch])

    // Переход из уведомления: /calendar?date=YYYY-MM-DD
    const dateParam = searchParams.get('date')
    useEffect(() => {
        if (!dateParam) return
        if (isValidIso(dateParam)) {
            setSelected(dateParam)
            setMonth(firstOfMonth(toDate(dateParam)))
        }
        setSearchParams({}, { replace: true })
    }, [dateParam, setSearchParams])

    const changeMonth = (next: Date) => {
        setMonth(next)
        const now = today()
        const isCurrent = next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth()
        setSelected(toIso(isCurrent ? now : next))
    }

    const days = useMemo(() => {
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        return Array.from({ length: count }, (_, i) =>
            new Date(month.getFullYear(), month.getMonth(), i + 1))
    }, [month])
    const leadingBlanks = (month.getDay() + 6) % 7

    const eventsByDay = useMemo(() => {
        const map = new Map<string, CalendarOccurrence[]>()
        events.forEach(event => map.set(event.date, [...(map.get(event.date) ?? []), event]))
        return map
    }, [events])

    const tasksByDay = useMemo(() => {
        const map = new Map<string, Task[]>()
        tasks.forEach(task => {
            const date = taskDate(task)
            if (date) map.set(date, [...(map.get(date) ?? []), task])
        })
        return map
    }, [tasks])

    const todayIso = toIso(today())
    const selectedEvents = eventsByDay.get(selected) ?? []
    const selectedTasks = tasksByDay.get(selected) ?? []

    const openCreateTask = () => {
        dispatch(fetchTags() as any)
        setCreateTaskOpen(true)
    }

    const openTask = async (task: Task) => {
        setActionError('')
        // У задачи пространства свои теги и список исполнителей
        dispatch(fetchTags(task.workspace) as any)
        if (task.workspace) {
            try {
                const { data } = await tasksApi.getWorkspace(task.workspace)
                setAssigneeOptions(data.members.map(m => ({
                    id: m.user.id,
                    label: getMemberName(m.user),
                })))
            } catch {
                setAssigneeOptions([])
            }
        } else {
            setAssigneeOptions([])
        }
        setEditingTask(task)
    }

    const toggleTask = async (task: Task) => {
        setActionError('')
        const next = task.status === TASK_STATUS.COMPLETED
            ? TASK_STATUS.ACTIVE
            : TASK_STATUS.COMPLETED
        try {
            await dispatch(changeTaskStatus(task.id, next) as any)
        } catch (e) {
            setActionError(parseApiError(e))
        }
    }

    return (
        <div className="calendar-page">
            <Header />

            <div className="calendar-page__layout">
                <section className="calendar-page__calendar">
                    <header className="calendar-page__month">
                        <button
                            type="button"
                            className="calendar-page__nav"
                            onClick={() => changeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                            aria-label="Предыдущий месяц"
                        >
                            ‹
                        </button>
                        <div className="calendar-page__current">
                            <h1 className="calendar-page__title">{formatMonth(month)}</h1>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => changeMonth(firstOfMonth(today()))}
                                title="Вернуться к сегодняшнему дню"
                            >
                                Сегодня
                            </Button>
                        </div>
                        <button
                            type="button"
                            className="calendar-page__nav"
                            onClick={() => changeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                            aria-label="Следующий месяц"
                        >
                            ›
                        </button>
                    </header>

                    {error && <p className="calendar-page__error">{error}</p>}

                    <div className="calendar-page__grid">
                        {Array.from({ length: leadingBlanks }, (_, i) => (
                            <div key={`blank-${i}`} className="calendar-page__blank" />
                        ))}
                        {days.map(day => {
                            const iso = toIso(day)
                            const dayEvents = eventsByDay.get(iso) ?? []
                            const openTasks = (tasksByDay.get(iso) ?? [])
                                .filter(t => t.status !== TASK_STATUS.COMPLETED).length
                            const extra = dayEvents.length - MAX_CELL_EVENTS
                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    className={[
                                        'calendar-cell',
                                        iso === todayIso && 'calendar-cell--today',
                                        iso === selected && 'calendar-cell--selected',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setSelected(iso)}
                                >
                                    <span className="calendar-cell__head">
                                        <span className="calendar-cell__number">{day.getDate()}</span>
                                        <span className="calendar-cell__weekday">{SHORT_WEEKDAYS[day.getDay()]}</span>
                                    </span>
                                    {dayEvents.slice(0, MAX_CELL_EVENTS).map(event => (
                                        <span
                                            key={`${event.id}-${event.date}`}
                                            className={`calendar-cell__event ${event.is_system ? 'calendar-cell__event--system' : ''}`}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </span>
                                    ))}
                                    {extra > 0 && <span className="calendar-cell__more">+{extra}</span>}
                                    {openTasks > 0 && (
                                        <span className="calendar-cell__tasks">Задач: {openTasks}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </section>

                <aside className="calendar-page__day">
                    <h2 className="calendar-page__day-title">{formatDay(selected)}</h2>
                    {actionError && <p className="calendar-page__error">{actionError}</p>}

                    <section className="calendar-day-section">
                        <header className="calendar-day-section__header">
                            <h3>События</h3>
                            <Button size="sm" variant="outline" onClick={() => setEventModal({ event: null })}>
                                Добавить
                            </Button>
                        </header>
                        {selectedEvents.length === 0 && (
                            <p className="calendar-day-section__empty">Событий нет</p>
                        )}
                        <ul className="calendar-day-section__list">
                            {selectedEvents.map(event => (
                                <li
                                    key={`${event.id}-${event.date}`}
                                    className={`calendar-item ${event.is_system ? 'calendar-item--system' : 'calendar-item--event'}`}
                                >
                                    {event.is_system ? (
                                        <div className="calendar-item__main">
                                            <span className="calendar-item__title">{event.title}</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="calendar-item__main"
                                            onClick={() => setEventModal({ event })}
                                        >
                                            <span className="calendar-item__title">{event.title}</span>
                                            {event.description && (
                                                <span className="calendar-item__description">{event.description}</span>
                                            )}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="calendar-day-section">
                        <header className="calendar-day-section__header">
                            <h3>Задачи</h3>
                            <Button size="sm" variant="outline" onClick={openCreateTask}>
                                Добавить
                            </Button>
                        </header>
                        {selectedTasks.length === 0 && (
                            <p className="calendar-day-section__empty">Задач нет</p>
                        )}
                        <ul className="calendar-day-section__list">
                            {selectedTasks.map(task => (
                                <li
                                    key={task.id}
                                    className={`calendar-item ${task.status === TASK_STATUS.COMPLETED ? 'calendar-item--completed' : ''}`}
                                    style={{ '--item-accent': PRIORITY_COLORS[task.priority] } as React.CSSProperties}
                                >
                                    <TaskCheckButton task={task} onToggle={toggleTask} />
                                    <button
                                        type="button"
                                        className="calendar-item__main"
                                        onClick={() => openTask(task)}
                                    >
                                        <span className="calendar-item__title">{task.title}</span>
                                        {task.workspace && (
                                            <span className="calendar-item__meta">Рабочее пространство</span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </aside>
            </div>

            <CreateTaskModal
                isOpen={createTaskOpen}
                onClose={() => setCreateTaskOpen(false)}
                defaultDueDate={selected}
                workspaceId={null}
            />

            <EditTaskModal
                isOpen={editingTask !== null}
                task={editingTask}
                onClose={() => setEditingTask(null)}
                assigneeOptions={assigneeOptions}
            />

            <EventModal
                isOpen={eventModal !== null}
                onClose={() => setEventModal(null)}
                event={eventModal?.event}
                defaultDate={selected}
            />
        </div>
    )
}

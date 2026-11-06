import type { Task, TaskFiltersState, WorkspaceMembership } from '@/types'
import { WORKSPACE_ROLE } from '@/types'
import type { User } from '@/types'

export const TASK_STATUS = { ACTIVE: 1, COMPLETED: 2, OVERDUE: 3 } as const
export const TASK_PRIORITY = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const

export const PRIORITY_LABELS: Record<number, string> = {
    1: 'Низкий',
    2: 'Средний',
    3: 'Высокий',
}

export const STATUS_LABELS: Record<number, string> = {
    1: 'Активна',
    2: 'Завершена',
    3: 'Просрочена',
}

export const PRIORITY_COLORS: Record<number, string> = {
    1: '#32b200',
    2: '#e19a00',
    3: '#ff0000',
}

export const toDate = (s: string): Date => {
    const d = new Date(s.includes('T') ? s : `${s}T00:00:00`)
    d.setHours(0, 0, 0, 0)
    return d
}

export const today = (): Date => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export const toIso = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/** Понедельник недели для даты */
export const getWeekStart = (date: Date = today()): Date => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d
}

export const addDays = (date: Date, days: number): Date => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

export const getEffectiveDate = (task: Task): string | null => {
    if (!task.due_date) return null

    const t = today()
    const due = toDate(task.due_date)

    if (task.deadline) {
        const dl = toDate(task.deadline)
        if (t > dl) return null
        if (t > due) return toIso(t)
    }

    return task.due_date
}

export const isTaskOverdue = (task: Task): boolean => {
    if (task.status === TASK_STATUS.COMPLETED) return false
    const t = today()

    if (task.deadline) return t > toDate(task.deadline)
    if (task.due_date) return t > toDate(task.due_date)
    return false
}

export const isTaskToday = (task: Task): boolean => {
    const eff = getEffectiveDate(task)
    if (!eff) return false
    return eff === toIso(today())
}

export const isTaskThisWeek = (task: Task, weekStart?: Date): boolean => {
    const eff = getEffectiveDate(task)
    if (!eff) return false
    const start = weekStart ?? getWeekStart()
    const end = addDays(start, 6)
    const d = toDate(eff)
    return d >= start && d <= end
}

export interface TaskGroup {
    date: string | null
    label: string
    tasks: Task[]
    isOverdue?: boolean
    isNoDeadline?: boolean
}

/** Все задачи: Без срока → Просрочено → даты по возрастанию */
export const groupTasksByDate = (tasks: Task[]): TaskGroup[] => {
    const overdue: Task[] = []
    const byDate: Record<string, Task[]> = {}
    const noDate: Task[] = []

    tasks.forEach(task => {
        if (task.status === TASK_STATUS.COMPLETED) return

        if (isTaskOverdue(task)) {
            overdue.push(task)
            return
        }

        const eff = getEffectiveDate(task)
        if (!eff) {
            noDate.push(task)
        } else {
            if (!byDate[eff]) byDate[eff] = []
            byDate[eff].push(task)
        }
    })

    const groups: TaskGroup[] = [
        {
            date: null,
            label: 'Без срока',
            tasks: noDate,
            isNoDeadline: true,
        },
    ]

    if (overdue.length) {
        groups.push({
            date: null,
            label: 'Просрочено',
            tasks: overdue,
            isOverdue: true,
        })
    }

    Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, dayTasks]) => {
            groups.push({ date, label: formatGroupLabel(date), tasks: dayTasks })
        })

    // Пустой борда: только «Без срока», чтобы было куда добавить первую задачу
    const hasAnyTasks = noDate.length > 0 || overdue.length > 0 || Object.keys(byDate).length > 0
    if (!hasAnyTasks) return []

    return groups
}

/** Ровно 7 колонок недели начиная с Monday */
export const groupTasksByWeek = (tasks: Task[], startDate: Date): TaskGroup[] => {
    return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(startDate, i)
        const iso = toIso(d)
        const dayTasks = tasks.filter(t => {
            if (t.status === TASK_STATUS.COMPLETED) return false
            return getEffectiveDate(t) === iso
        })
        return { date: iso, label: formatWeekDayLabel(iso), tasks: dayTasks }
    })
}

export const formatGroupLabel = (iso: string): string => {
    const d = toDate(iso)
    const t = today()
    if (toIso(d) === toIso(t)) return 'Сегодня'

    const tomorrow = addDays(t, 1)
    if (toIso(d) === toIso(tomorrow)) return 'Завтра'

    const formatted = d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const SHORT_WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

/** «Пн, 3 ноября» — короткий день недели для недельной доски */
export const formatWeekDayLabel = (iso: string): string => {
    const d = toDate(iso)
    const t = today()
    if (toIso(d) === toIso(t)) return 'Сегодня'

    const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    return `${SHORT_WEEKDAYS[d.getDay()]}, ${date}`
}

export const formatShortDate = (iso: string): string => {
    return toDate(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export const filterTasks = (tasks: Task[], filters: TaskFiltersState): Task[] => {
    return tasks.filter(task => {
        if (filters.search) {
            const q = filters.search.toLowerCase()
            const inTitle = task.title.toLowerCase().includes(q)
            const inDesc = task.description?.toLowerCase().includes(q)
            if (!inTitle && !inDesc) return false
        }
        if (filters.priority !== null && task.priority !== filters.priority) return false
        if (filters.status !== null && task.status !== filters.status) return false
        if (filters.tagId !== null && !task.tags.some(t => t.id === filters.tagId)) return false
        return true
    })
}

/** Сортировка: сначала важные, затем по дате, затем более новые */
export const sortTasksByPriority = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority
        const ad = a.due_date ?? '9999-12-31'
        const bd = b.due_date ?? '9999-12-31'
        if (ad !== bd) return ad.localeCompare(bd)
        return b.created_at.localeCompare(a.created_at)
    })
}

export const canManageTask = (
    task: Task,
    user: User | null,
    membership: WorkspaceMembership | null | undefined,
): boolean => {
    if (!user) return false
    if (task.owner.id === user.id) return true
    if (!task.workspace) return false
    if (!membership) return false
    return membership.role >= WORKSPACE_ROLE.ADMIN
}

export const canCompleteTask = (
    task: Task,
    user: User | null,
    membership: WorkspaceMembership | null | undefined,
): boolean => {
    if (!user) return false
    if (canManageTask(task, user, membership)) return true
    if (task.assignees.some(a => a.id === user.id)) return true
    if (membership) return true
    return false
}

export const getUserMembership = (
    members: WorkspaceMembership[] | undefined,
    userId: number,
): WorkspaceMembership | null => {
    if (!members) return null
    return members.find(m => m.user.id === userId) ?? null
}

export const getWorkspaceInviteLink = (inviteCode: string): string => {
    return `${window.location.origin}/tasks/workspaces/join/${inviteCode}`
}

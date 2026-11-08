import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import type { RootState } from '@/stores'
import { tasksApi } from '@/api/tasks'
import {
    editTask,
    deleteTask,
    changeTaskStatus,
    refreshTask,
} from '@/stores/tasks/tasksActions'
import {
    PRIORITY_LABELS,
    TASK_STATUS,
    getCompletionBlockReason,
    isTaskOverdue,
    toDate,
    toIso,
    today,
} from '@/utils/tasksUtils'
import { parseApiError } from '@/utils'
import type { CreateTaskData, Task } from '@/types'
import { TaskComments } from '@/features/tasks/TaskComments/TaskComments'
import { SubtasksPanel } from '@/features/tasks/SubtasksPanel/SubtasksPanel'
import './EditTaskModal.scss'

type AssigneeOption = { id: number; label: string }
type TaskPatch = Partial<CreateTaskData>

interface EditTaskModalProps {
    isOpen: boolean
    task: Task | null
    canDelete?: boolean
    onClose: () => void
    assigneeOptions?: AssigneeOption[]
}

/**
 * Карточка задачи: по центру — задача (или открытая подзадача), под ней комментарии,
 * справа — список подзадач. Подзадачи только одного уровня.
 */
export const EditTaskModal: React.FC<EditTaskModalProps> = ({
    isOpen,
    task,
    canDelete = true,
    onClose,
    assigneeOptions = [],
}) => {
    const dispatch = useDispatch()
    const storeTasks = useSelector((state: RootState) => state.tasks.tasks)
    // Берём актуальную версию из стора: статус задачи меняется вместе с подзадачами
    const root = task ? storeTasks.find(t => t.id === task.id) ?? task : null

    const [subtasks, setSubtasks] = useState<Task[]>([])
    const [subtasksLoading, setSubtasksLoading] = useState(false)
    const [activeId, setActiveId] = useState<number | null>(null)
    const [panelError, setPanelError] = useState('')

    const rootId = task?.id ?? null

    useEffect(() => {
        if (!isOpen || rootId == null) return
        let cancelled = false
        setActiveId(rootId)
        setSubtasks([])
        setPanelError('')
        setSubtasksLoading(true)
        tasksApi.getSubtasks(rootId)
            .then(response => !cancelled && setSubtasks(response.data))
            .catch(e => !cancelled && setPanelError(parseApiError(e)))
            .finally(() => !cancelled && setSubtasksLoading(false))
        return () => {
            cancelled = true
        }
    }, [isOpen, rootId])

    const replaceSubtask = useCallback((updated: Task) => {
        setSubtasks(prev => prev.map(s => (s.id === updated.id ? updated : s)))
    }, [])

    if (!root) return null

    const active = subtasks.find(s => s.id === activeId) ?? root
    const isSubtask = active.id !== root.id
    const subIndex = subtasks.findIndex(s => s.id === active.id)
    const refreshRoot = () => dispatch(refreshTask(root.id) as any)

    const handleSave = async (data: TaskPatch) => {
        if (!isSubtask) {
            await dispatch(editTask(root.id, data) as any)
            onClose()
            return false
        }
        const response = await tasksApi.updateTask(active.id, data)
        replaceSubtask(response.data)
        return true
    }

    const handleDelete = async () => {
        if (!isSubtask) {
            await dispatch(deleteTask(root.id) as any)
            onClose()
            return
        }
        await tasksApi.deleteTask(active.id)
        const rest = subtasks.filter(s => s.id !== active.id)
        setSubtasks(rest)
        // Переходим на соседнюю подзадачу, а если их не осталось — к основной задаче
        const next = rest[Math.min(subIndex, rest.length - 1)]
        setActiveId(next ? next.id : root.id)
        refreshRoot()
    }

    const handleToggle = async (target: Task) => {
        const next = target.status === TASK_STATUS.COMPLETED
            ? TASK_STATUS.ACTIVE
            : TASK_STATUS.COMPLETED
        setPanelError('')
        try {
            const result = await (dispatch(changeTaskStatus(target.id, next) as any) as Promise<{
                task: Task
                parent: Task | null
            }>)
            if (target.id !== root.id) {
                replaceSubtask(result.task)
                if (!result.parent) refreshRoot() // счётчик подзадач на карточке
            }
        } catch (e) {
            setPanelError(parseApiError(e))
        }
    }

    const handleAddSubtask = async (title: string) => {
        setPanelError('')
        try {
            const response = await tasksApi.createTask({ title, parent: root.id })
            setSubtasks(prev => [...prev, response.data])
            refreshRoot()
        } catch (e) {
            setPanelError(parseApiError(e))
            throw e
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            className="edit-task-modal-backdrop"
            title={isSubtask ? 'Подзадача' : 'Задача'}
        >
            <div className="task-detail">
                <div className="task-detail__main">
                    {isSubtask && (
                        <div className="task-detail__nav">
                            <button
                                type="button"
                                className="task-detail__back"
                                onClick={() => setActiveId(root.id)}
                                title={root.title}
                            >
                                ← К задаче «{root.title}»
                            </button>
                            <div className="task-detail__pager">
                                <button
                                    type="button"
                                    className="task-detail__pager-btn"
                                    disabled={subIndex <= 0}
                                    onClick={() => setActiveId(subtasks[subIndex - 1].id)}
                                    aria-label="Предыдущая подзадача"
                                    title="Предыдущая подзадача"
                                >
                                    ‹
                                </button>
                                <span className="task-detail__pager-label">
                                    {subIndex + 1} из {subtasks.length}
                                </span>
                                <button
                                    type="button"
                                    className="task-detail__pager-btn"
                                    disabled={subIndex >= subtasks.length - 1}
                                    onClick={() => setActiveId(subtasks[subIndex + 1].id)}
                                    aria-label="Следующая подзадача"
                                    title="Следующая подзадача"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    )}

                    <TaskForm
                        key={active.id}
                        task={active}
                        isSubtask={isSubtask}
                        canDelete={canDelete}
                        assigneeOptions={assigneeOptions}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onCancel={onClose}
                        onToggleStatus={() => handleToggle(active)}
                    />
                </div>

                <div className="task-detail__side">
                    <SubtasksPanel
                        root={root}
                        subtasks={subtasks}
                        activeId={active.id}
                        isLoading={subtasksLoading}
                        onSelect={setActiveId}
                        onToggle={handleToggle}
                        onAdd={handleAddSubtask}
                    />
                    {panelError && <p className="edit-task-modal__error">{panelError}</p>}
                </div>

                {active.workspace && (
                    <div className="task-detail__comments">
                        <TaskComments key={active.id} task={active} />
                    </div>
                )}
            </div>
        </Modal>
    )
}

interface TaskFormProps {
    task: Task
    isSubtask: boolean
    canDelete: boolean
    assigneeOptions: AssigneeOption[]
    /** true — остаёмся в карточке (подзадача), false — карточка закрывается */
    onSave: (data: TaskPatch) => Promise<boolean>
    onDelete: () => Promise<void>
    onCancel: () => void
    onToggleStatus: () => Promise<void>
}

const TaskForm: React.FC<TaskFormProps> = ({
    task,
    isSubtask,
    canDelete,
    assigneeOptions,
    onSave,
    onDelete,
    onCancel,
    onToggleStatus,
}) => {
    const { tags: tagsState } = useSelector((state: RootState) => state.tasks)
    const tags = Array.isArray(tagsState) ? tagsState : []
    const [title, setTitle] = useState(task.title)
    const [description, setDescription] = useState(task.description || '')
    const [dueDate, setDueDate] = useState(task.due_date || '')
    const [deadline, setDeadline] = useState(task.deadline || '')
    const [priority, setPriority] = useState<number>(task.priority)
    const [tagId, setTagId] = useState<number | ''>(task.tags[0]?.id ?? '')
    const [assigneeId, setAssigneeId] = useState<number | ''>(task.assignees[0]?.id ?? '')
    const [isSaving, setIsSaving] = useState(false)
    const [isRescheduling, setIsRescheduling] = useState(false)
    const [isToggling, setIsToggling] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!saved) return
        const timer = window.setTimeout(() => setSaved(false), 2000)
        return () => window.clearTimeout(timer)
    }, [saved])

    const isCompleted = task.status === TASK_STATUS.COMPLETED
    const isOverdue = isTaskOverdue(task)
    const blockReason = getCompletionBlockReason(task)
    const kind = isSubtask ? 'подзадачу' : 'задачу'

    const save = async (data: TaskPatch, failMessage: string) => {
        setError('')
        try {
            const stay = await onSave(data)
            if (stay) setSaved(true)
        } catch (e) {
            setError(parseApiError(e) || failMessage)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setError(`Введите название`)
            return
        }
        setIsSaving(true)
        await save({
            title: title.trim(),
            description: description.trim(),
            due_date: dueDate || null,
            deadline: deadline || null,
            priority,
            tags: tagId ? [Number(tagId)] : [],
            assignees: assigneeId ? [Number(assigneeId)] : [],
        }, 'Не удалось сохранить изменения')
        setIsSaving(false)
    }

    /** Перенос просроченной задачи на сегодня (дедлайн тоже сдвигаем, если он уже прошёл) */
    const handleMoveToToday = async () => {
        const todayIso = toIso(today())
        const nextDeadline =
            task.deadline && toDate(task.deadline) < today() ? todayIso : task.deadline
        setIsRescheduling(true)
        await save({ due_date: todayIso, deadline: nextDeadline }, 'Не удалось перенести задачу')
        setDueDate(todayIso)
        setDeadline(nextDeadline || '')
        setIsRescheduling(false)
    }

    const handleToggle = async () => {
        setIsToggling(true)
        try {
            await onToggleStatus()
        } finally {
            setIsToggling(false)
        }
    }

    const handleDelete = async () => {
        try {
            await onDelete()
            setConfirmDelete(false)
        } catch (e) {
            setConfirmDelete(false)
            setError(parseApiError(e) || `Не удалось удалить ${kind}`)
        }
    }

    return (
        <>
            <form className="edit-task-modal" onSubmit={handleSubmit}>
                <div className={`edit-task-modal__status ${isCompleted ? 'edit-task-modal__status--done' : ''}`}>
                    <span className="edit-task-modal__status-text">
                        {isCompleted ? 'Выполнена' : 'В работе'}
                        {!isSubtask && task.subtasks_count > 0 && (
                            <span className="edit-task-modal__status-sub">
                                {' '}· подзадачи {task.completed_subtasks_count}/{task.subtasks_count}
                            </span>
                        )}
                    </span>
                    <Button
                        type="button"
                        variant={isCompleted ? 'outline' : 'primary'}
                        size="sm"
                        loading={isToggling}
                        disabled={Boolean(blockReason)}
                        title={blockReason ?? undefined}
                        onClick={handleToggle}
                    >
                        {isCompleted ? 'Вернуть в работу' : 'Отметить выполненной'}
                    </Button>
                </div>
                {blockReason && <p className="edit-task-modal__hint">{blockReason}</p>}

                {isOverdue && (
                    <div className="edit-task-modal__overdue">
                        <span className="edit-task-modal__overdue-text">
                            {isSubtask ? 'Подзадача просрочена' : 'Задача просрочена'}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={isRescheduling}
                            onClick={handleMoveToToday}
                        >
                            Перенести на сегодня
                        </Button>
                    </div>
                )}

                <label className="edit-task-modal__field">
                    <span>Название</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </label>

                <label className="edit-task-modal__field">
                    <span>Описание</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                    />
                </label>

                <div className="edit-task-modal__grid">
                    <label className="edit-task-modal__field">
                        <span>Дата</span>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </label>
                    <label className="edit-task-modal__field">
                        <span>Дедлайн</span>
                        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                    </label>
                    <label className="edit-task-modal__field">
                        <span>Приоритет</span>
                        <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="edit-task-modal__field">
                        <span>Тег</span>
                        <select
                            value={tagId}
                            onChange={(e) => setTagId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Без тега</option>
                            {tags.map(tag => (
                                <option key={tag.id} value={tag.id}># {tag.title}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {assigneeOptions.length > 0 && (
                    <label className="edit-task-modal__field">
                        <span>Исполнитель</span>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Не назначен</option>
                            {assigneeOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </label>
                )}

                {error && <p className="edit-task-modal__error">{error}</p>}

                <div className="edit-task-modal__footer">
                    {canDelete && (
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmDelete(true)}
                        >
                            Удалить
                        </Button>
                    )}
                    <div className="edit-task-modal__footer-right">
                        {saved && <span className="edit-task-modal__saved">Сохранено</span>}
                        <Button type="button" variant="outline" onClick={onCancel}>
                            {isSubtask ? 'Закрыть' : 'Отмена'}
                        </Button>
                        <Button type="submit" variant="primary" loading={isSaving}>
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>

            <ConfirmationModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title={isSubtask ? 'Удалить подзадачу?' : 'Удалить задачу?'}
                description={
                    isSubtask
                        ? `Подзадача «${task.title}» будет удалена безвозвратно.`
                        : `Задача «${task.title}» будет удалена безвозвратно вместе с подзадачами.`
                }
                confirmText="Удалить"
                variant="danger"
            />
        </>
    )
}

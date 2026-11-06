import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import type { RootState } from '@/stores'
import { editTask, deleteTask } from '@/stores/tasks/tasksActions'
import { PRIORITY_LABELS, isTaskOverdue, toDate, toIso, today } from '@/utils/tasksUtils'
import type { Task } from '@/types'
import './EditTaskModal.scss'

interface EditTaskModalProps {
    isOpen: boolean
    task: Task | null
    canDelete?: boolean
    onClose: () => void
    assigneeOptions?: { id: number; label: string }[]
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
    isOpen,
    task,
    canDelete = true,
    onClose,
    assigneeOptions = [],
}) => {
    const dispatch = useDispatch()
    const { tags: tagsState, isLoading } = useSelector((state: RootState) => state.tasks)
    const tags = Array.isArray(tagsState) ? tagsState : []
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [deadline, setDeadline] = useState('')
    const [priority, setPriority] = useState<number>(1)
    const [isRescheduling, setIsRescheduling] = useState(false)
    const [tagId, setTagId] = useState<number | ''>('')
    const [assigneeId, setAssigneeId] = useState<number | ''>('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (task && isOpen) {
            setTitle(task.title)
            setDescription(task.description || '')
            setDueDate(task.due_date || '')
            setDeadline(task.deadline || '')
            setPriority(task.priority)
            setTagId(task.tags[0]?.id ?? '')
            setAssigneeId(task.assignees[0]?.id ?? '')
            setError('')
            setConfirmDelete(false)
        }
    }, [task, isOpen])

    if (!task) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setError('Введите название задачи')
            return
        }

        try {
            await dispatch(editTask(task.id, {
                title: title.trim(),
                description: description.trim(),
                due_date: dueDate || null,
                deadline: deadline || null,
                priority,
                tags: tagId ? [Number(tagId)] : [],
                assignees: assigneeId ? [Number(assigneeId)] : [],
            }) as any)
            onClose()
        } catch {
            setError('Не удалось сохранить изменения')
        }
    }

    const isOverdue = isTaskOverdue(task)

    /** Перенос просроченной задачи на сегодня (дедлайн тоже сдвигаем, если он уже прошёл) */
    const handleMoveToToday = async () => {
        const todayIso = toIso(today())
        const nextDeadline =
            task.deadline && toDate(task.deadline) < today() ? todayIso : task.deadline
        setIsRescheduling(true)
        try {
            await dispatch(editTask(task.id, {
                due_date: todayIso,
                deadline: nextDeadline,
            }) as any)
            onClose()
        } catch {
            setError('Не удалось перенести задачу')
        } finally {
            setIsRescheduling(false)
        }
    }

    const handleDelete = async () => {
        try {
            await dispatch(deleteTask(task.id) as any)
            setConfirmDelete(false)
            onClose()
        } catch {
            setError('Не удалось удалить задачу')
        }
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                size="md"
                className="edit-task-modal-backdrop"
                title="Редактирование задачи"
            >
                <form className="edit-task-modal" onSubmit={handleSubmit}>
                    {isOverdue && (
                        <div className="edit-task-modal__overdue">
                            <span className="edit-task-modal__overdue-text">
                                Задача просрочена
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
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
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
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </label>
                        <label className="edit-task-modal__field">
                            <span>Дедлайн</span>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </label>
                        <label className="edit-task-modal__field">
                            <span>Приоритет</span>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(Number(e.target.value))}
                            >
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
                                onChange={(e) =>
                                    setAssigneeId(e.target.value ? Number(e.target.value) : '')
                                }
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
                            <Button type="button" variant="outline" onClick={onClose}>
                                Отмена
                            </Button>
                            <Button type="submit" variant="primary" loading={isLoading}>
                                Сохранить
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="Удалить задачу?"
                description={`Задача «${task.title}» будет удалена безвозвратно.`}
                confirmText="Удалить"
                variant="danger"
            />
        </>
    )
}

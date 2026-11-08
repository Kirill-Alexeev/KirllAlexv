import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import type { RootState } from '@/stores'
import { createTask, createTag } from '@/stores/tasks/tasksActions'
import { PRIORITY_LABELS, TASK_PRIORITY, toIso, today } from '@/utils/tasksUtils'
import type { CreateTaskData } from '@/types'
import addIcon from '@/assets/icons/add.svg'
import './CreateTaskModal.scss'

interface CreateTaskModalProps {
    isOpen: boolean
    onClose: () => void
    defaultDueDate?: string | null
    workspaceId?: number | null
    assigneeOptions?: { id: number; label: string }[]
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    defaultDueDate = null,
    workspaceId = null,
    assigneeOptions = [],
}) => {
    const dispatch = useDispatch()
    const { tags: tagsState, isLoading } = useSelector((state: RootState) => state.tasks)
    const tags = Array.isArray(tagsState) ? tagsState : []
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [deadline, setDeadline] = useState('')
    const [priority, setPriority] = useState<number>(TASK_PRIORITY.LOW)
    const [tagId, setTagId] = useState<number | ''>('')
    const [assigneeId, setAssigneeId] = useState<number | ''>('')
    const [newTag, setNewTag] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setTitle('')
            setDescription('')
            setDueDate(defaultDueDate ?? '')
            setDeadline('')
            setPriority(TASK_PRIORITY.LOW)
            setTagId('')
            setAssigneeId('')
            setNewTag('')
            setError('')
        }
    }, [isOpen, defaultDueDate])

    const handleCreateTag = async () => {
        const name = newTag.trim()
        if (!name) return
        try {
            const tag = await dispatch(createTag({ title: name, workspace: workspaceId }) as any)
            setTagId(tag.id)
            setNewTag('')
        } catch (e: any) {
            const titleError = e?.response?.data?.title
            setError(titleError ? String(titleError) : 'Не удалось создать тег')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setError('Введите название задачи')
            return
        }

        const data: CreateTaskData = {
            title: title.trim(),
            description: description.trim(),
            workspace: workspaceId,
            due_date: dueDate || null,
            deadline: deadline || null,
            priority,
            tags: tagId ? [Number(tagId)] : [],
            assignees: assigneeId ? [Number(assigneeId)] : [],
        }

        try {
            await dispatch(createTask(data) as any)
            onClose()
        } catch {
            setError('Не удалось создать задачу')
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            className="create-task-modal-backdrop"
            showCloseButton
        >
            <form className="create-task-modal" onSubmit={handleSubmit}>
                <input
                    className="create-task-modal__title"
                    placeholder="Название задачи"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />
                <textarea
                    className="create-task-modal__description"
                    placeholder="Описание задачи"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                />

                <div className="create-task-modal__fields">
                    <label className="create-task-modal__field">
                        <span className="create-task-modal__label">Дата</span>
                        <input
                            type="date"
                            value={dueDate}
                            min={toIso(today())}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </label>
                    <label className="create-task-modal__field">
                        <span className="create-task-modal__label">Дедлайн</span>
                        <input
                            type="date"
                            value={deadline}
                            min={dueDate || toIso(today())}
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                    </label>
                    <label className="create-task-modal__field">
                        <span className="create-task-modal__label">Приоритет</span>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(Number(e.target.value))}
                        >
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="create-task-modal__row">
                    <label className="create-task-modal__select">
                        <span className="create-task-modal__label"># Тег</span>
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

                    <div className="create-task-modal__new-tag">
                        <input
                            type="text"
                            placeholder="Новый тег"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={addIcon}
                            className="create-task-modal__new-tag-btn"
                            onClick={handleCreateTag}
                            disabled={!newTag.trim()}
                        >
                            Создать
                        </Button>
                    </div>
                </div>

                {assigneeOptions.length > 0 && (
                    <label className="create-task-modal__select">
                        <span className="create-task-modal__label">Исполнитель</span>
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

                {error && <p className="create-task-modal__error">{error}</p>}

                <div className="create-task-modal__footer">
                    <Button type="submit" variant="primary" loading={isLoading}>
                        Добавить задачу
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

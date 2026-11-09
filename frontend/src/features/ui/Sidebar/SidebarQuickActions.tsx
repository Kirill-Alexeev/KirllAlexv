import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal/Modal'
import { tasksApi } from '@/api/tasks'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal/CreateTaskModal'
import { EventModal } from '@/features/calendar/EventModal/EventModal'
import { addTask } from '@/stores/tasks/tasksSlice'
import { refreshNotifications } from '@/stores/notifications/notificationsActions'
import { parseApiError } from '@/utils'
import { getMemberName } from '@/utils/tasksUtils'
import type { CreateTaskData, SidebarActionId, Tag, Task, Workspace } from '@/types'
import addIcon from '@/assets/icons/add.svg'
import calendarIcon from '@/assets/icons/calendar.svg'
import './SidebarQuickActions.scss'

const ACTION_VIEW: Record<SidebarActionId, { label: string; icon: string }> = {
    task: { label: 'Добавить задачу', icon: addIcon },
    workspace_task: { label: 'Добавить задачу в пространство', icon: addIcon },
    event: { label: 'Добавить событие', icon: calendarIcon },
}

interface TaskModalState {
    workspaceId: number | null
    tags: Tag[]
    assigneeOptions: { id: number; label: string }[]
}

/** Показывать ли новую задачу в списке, который сейчас открыт */
const belongsToPage = (task: Task, pathname: string) => {
    if (pathname === '/calendar') return Boolean(task.due_date || task.deadline)
    if (pathname === '/tasks') return !task.workspace
    return pathname === `/tasks/workspaces/${task.workspace}`
}

interface SidebarQuickActionsProps {
    actions: SidebarActionId[]
    isCollapsed: boolean
}

/** Кнопки быстрого добавления, которые пользователь вывел в сайдбар */
export const SidebarQuickActions: React.FC<SidebarQuickActionsProps> = ({ actions, isCollapsed }) => {
    const dispatch = useDispatch()
    const { pathname } = useLocation()
    const [taskModal, setTaskModal] = useState<TaskModalState | null>(null)
    const [eventOpen, setEventOpen] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [pickerLoading, setPickerLoading] = useState(false)
    const [pickerError, setPickerError] = useState('')

    useEffect(() => {
        if (!pickerOpen) return
        let cancelled = false
        setPickerLoading(true)
        setPickerError('')
        tasksApi.getWorkspaces()
            .then(({ data }) => !cancelled && setWorkspaces(data))
            .catch(e => !cancelled && setPickerError(parseApiError(e)))
            .finally(() => !cancelled && setPickerLoading(false))
        return () => {
            cancelled = true
        }
    }, [pickerOpen])

    // Теги загружаем отдельно: в сторе лежат теги открытой страницы
    const openPersonalTask = async () => {
        const tags = await tasksApi.getTags().then(r => r.data).catch(() => [] as Tag[])
        setTaskModal({ workspaceId: null, tags, assigneeOptions: [] })
    }

    const openWorkspaceTask = async (workspace: Workspace) => {
        setPickerError('')
        try {
            const [detail, tags] = await Promise.all([
                tasksApi.getWorkspace(workspace.id),
                tasksApi.getTags(workspace.id),
            ])
            setTaskModal({
                workspaceId: workspace.id,
                tags: tags.data,
                assigneeOptions: detail.data.members.map(m => ({
                    id: m.user.id,
                    label: getMemberName(m.user),
                })),
            })
            setPickerOpen(false)
        } catch (e) {
            setPickerError(parseApiError(e))
        }
    }

    const handlers: Record<SidebarActionId, () => void> = {
        task: openPersonalTask,
        workspace_task: () => setPickerOpen(true),
        event: () => setEventOpen(true),
    }

    const handleCreateTask = async (data: CreateTaskData) => {
        const { data: task } = await tasksApi.createTask(data)
        if (belongsToPage(task, pathname)) dispatch(addTask(task))
        refreshNotifications(dispatch)
    }

    return (
        <>
            {actions.map(id => (
                <Button
                    key={id}
                    variant="ghost"
                    size="md"
                    icon={ACTION_VIEW[id].icon}
                    onClick={handlers[id]}
                    className="sidebar__add-btn"
                    title={ACTION_VIEW[id].label}
                >
                    {!isCollapsed && ACTION_VIEW[id].label}
                </Button>
            ))}

            {taskModal && (
                <CreateTaskModal
                    isOpen
                    onClose={() => setTaskModal(null)}
                    workspaceId={taskModal.workspaceId}
                    assigneeOptions={taskModal.assigneeOptions}
                    external={{
                        tags: taskModal.tags,
                        onCreate: handleCreateTask,
                        onTagCreated: (tag) => setTaskModal(prev =>
                            prev && { ...prev, tags: [...prev.tags, tag] }),
                    }}
                />
            )}

            <EventModal isOpen={eventOpen} onClose={() => setEventOpen(false)} />

            <Modal
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                title="Выберите пространство"
                size="md"
            >
                <div className="workspace-picker">
                    {pickerLoading && <p className="workspace-picker__hint">Загрузка…</p>}
                    {!pickerLoading && !pickerError && workspaces.length === 0 && (
                        <p className="workspace-picker__hint">У вас пока нет рабочих пространств</p>
                    )}
                    {pickerError && <p className="workspace-picker__error">{pickerError}</p>}
                    {workspaces.map(workspace => (
                        <button
                            key={workspace.id}
                            type="button"
                            className="workspace-picker__item"
                            onClick={() => openWorkspaceTask(workspace)}
                        >
                            <span className="workspace-picker__title">{workspace.title}</span>
                            {workspace.description && (
                                <span className="workspace-picker__description">{workspace.description}</span>
                            )}
                        </button>
                    ))}
                </div>
            </Modal>
        </>
    )
}

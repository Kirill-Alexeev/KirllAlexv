import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { RootState, AppDispatch } from '@/stores'
import type { Task, TaskViewMode } from '@/types'
import { Header } from '@/components/Home/Header/Header'
import { TaskTabs } from '@/components/tasks/TaskTabs/TaskTabs'
import { TaskFilters } from '@/components/tasks/TaskFilters/TaskFilters'
import { AllTasksView } from '@/features/tasks/AllTasksView/AllTasksView'
import { TodayView } from '@/features/tasks/TodayView/TodayView'
import { WeekView } from '@/features/tasks/WeekView/WeekView'
import { CompletedView } from '@/features/tasks/CompletedView/CompletedView'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal/CreateTaskModal'
import { EditTaskModal } from '@/features/tasks/EditTaskModal/EditTaskModal'
import { InviteLinkModal } from '@/features/tasks/InviteLinkModal/InviteLinkModal'
import { Button } from '@/components/ui'
import {
    fetchTasks,
    fetchTags,
    fetchWorkspace,
    changeTaskStatus,
    deleteCompletedTasks,
} from '@/stores/tasks/tasksActions'
import { setCurrentTask, setTasks } from '@/stores/tasks/tasksSlice'
import { WORKSPACE_ROLE } from '@/types'
import {
    TASK_STATUS,
    canCompleteTask,
    canManageTask,
    filterTasks,
    getUserMembership,
    sortTasksByPriority,
} from '@/utils/tasksUtils'
import './WorkspacePage.scss'

export const WorkspacePage: React.FC = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const id = Number(workspaceId)
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { user } = useSelector((state: RootState) => state.auth)
    const { tasks, filters, currentWorkspace, currentTask, isLoading } = useSelector(
        (state: RootState) => state.tasks,
    )

    const [view, setView] = useState<TaskViewMode>('all')
    const [createOpen, setCreateOpen] = useState(false)
    const [createDueDate, setCreateDueDate] = useState<string | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [inviteOpen, setInviteOpen] = useState(false)

    useEffect(() => {
        if (!id) return
        // Не показываем задачи с предыдущей страницы, пока грузятся задачи пространства
        dispatch(setTasks([]))
        dispatch(fetchWorkspace(id) as any)
        dispatch(fetchTasks(id) as any)
        dispatch(fetchTags() as any)
    }, [dispatch, id])

    const membership = useMemo(
        () => getUserMembership(currentWorkspace?.members, user?.id ?? 0),
        [currentWorkspace, user],
    )

    const filtered = useMemo(
        () => sortTasksByPriority(filterTasks(tasks, filters)),
        [tasks, filters],
    )

    const assigneeOptions = useMemo(() => {
        return (currentWorkspace?.members ?? []).map(m => ({
            id: m.user.id,
            label: m.user.first_name
                ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
                : m.user.username,
        }))
    }, [currentWorkspace])

    const handleViewChange = (mode: TaskViewMode) => {
        if (mode === 'workspaces') {
            navigate('/tasks?view=workspaces')
            return
        }
        setView(mode)
    }

    const handleAdd = (dueDate?: string | null) => {
        setCreateDueDate(dueDate ?? null)
        setCreateOpen(true)
    }

    const handleToggle = (task: Task) => {
        const next = task.status === TASK_STATUS.COMPLETED
            ? TASK_STATUS.ACTIVE
            : TASK_STATUS.COMPLETED
        dispatch(changeTaskStatus(task.id, next) as any)
    }

    const handleTaskClick = (task: Task) => {
        dispatch(setCurrentTask(task))
        setEditOpen(true)
    }

    const canManage = (task: Task) => canManageTask(task, user, membership)
    const canComplete = (task: Task) => canCompleteTask(task, user, membership)
    const isAdmin = Boolean(
        membership && membership.role >= WORKSPACE_ROLE.ADMIN,
    )

    return (
        <div className="workspace-page">
            <Header />

            <div className="workspace-page__top">
                <Link to="/tasks?view=workspaces" className="workspace-page__back">
                    ← К пространствам
                </Link>
                <div className="workspace-page__heading">
                    <div>
                        <h1 className="workspace-page__title">
                            {currentWorkspace?.title || 'Рабочее пространство'}
                        </h1>
                        {currentWorkspace?.description && (
                            <p className="workspace-page__desc">{currentWorkspace.description}</p>
                        )}
                    </div>
                    <div className="workspace-page__actions">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInviteOpen(true)}
                            disabled={!currentWorkspace}
                        >
                            Пригласить по ссылке
                        </Button>
                        {isAdmin && (
                            <Button variant="primary" size="sm" onClick={() => handleAdd(null)}>
                                Добавить задачу
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <TaskTabs active={view} onChange={handleViewChange} />
            <TaskFilters />

            {isLoading && !tasks.length ? (
                <p className="workspace-page__loading">Загрузка…</p>
            ) : (
                <>
                    {view === 'all' && (
                        <AllTasksView
                            tasks={filtered}
                            canAdd={isAdmin}
                            canComplete={canComplete}
                            canManage={canManage}
                            onAdd={handleAdd}
                            onToggleStatus={handleToggle}
                            onTaskClick={handleTaskClick}
                        />
                    )}
                    {view === 'today' && (
                        <TodayView
                            tasks={filtered}
                            canAdd={isAdmin}
                            canComplete={canComplete}
                            canManage={canManage}
                            onAdd={() => handleAdd(null)}
                            onToggleStatus={handleToggle}
                            onTaskClick={handleTaskClick}
                        />
                    )}
                    {view === 'week' && (
                        <WeekView
                            tasks={filtered}
                            canAdd={isAdmin}
                            canComplete={canComplete}
                            canManage={canManage}
                            onAdd={handleAdd}
                            onToggleStatus={handleToggle}
                            onTaskClick={handleTaskClick}
                        />
                    )}
                    {view === 'completed' && (
                        <CompletedView
                            tasks={filtered}
                            canManage={canManage}
                            onToggleStatus={handleToggle}
                            onTaskClick={handleTaskClick}
                            onDeleteMany={async (ids) => {
                                await dispatch(deleteCompletedTasks(ids) as any)
                            }}
                        />
                    )}
                </>
            )}

            <CreateTaskModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                defaultDueDate={createDueDate}
                workspaceId={id}
                assigneeOptions={assigneeOptions}
            />

            <EditTaskModal
                isOpen={editOpen}
                task={currentTask}
                canDelete={currentTask ? canManage(currentTask) : false}
                onClose={() => {
                    setEditOpen(false)
                    dispatch(setCurrentTask(null))
                }}
                assigneeOptions={assigneeOptions}
            />

            <InviteLinkModal
                isOpen={inviteOpen}
                onClose={() => setInviteOpen(false)}
                workspaceTitle={currentWorkspace?.title}
                inviteCode={currentWorkspace?.invite_code}
            />
        </div>
    )
}

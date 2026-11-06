import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { RootState, AppDispatch } from '@/stores'
import type { Task, TaskViewMode } from '@/types'
import { Header } from '@/components/Home/Header/Header'
import { TaskTabs } from '@/components/tasks/TaskTabs/TaskTabs'
import { TaskFilters } from '@/components/tasks/TaskFilters/TaskFilters'
import { AllTasksView } from '@/features/tasks/AllTasksView/AllTasksView'
import { TodayView } from '@/features/tasks/TodayView/TodayView'
import { WeekView } from '@/features/tasks/WeekView/WeekView'
import { CompletedView } from '@/features/tasks/CompletedView/CompletedView'
import { WorkspacesView } from '@/features/tasks/WorkspacesView/WorkspacesView'
import { CreateTaskModal } from '@/features/tasks/CreateTaskModal/CreateTaskModal'
import { EditTaskModal } from '@/features/tasks/EditTaskModal/EditTaskModal'
import { CreateWorkspaceModal } from '@/features/tasks/CreateWorkspaceModal/CreateWorkspaceModal'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import {
    fetchTasks,
    fetchTags,
    fetchWorkspaces,
    changeTaskStatus,
    deleteCompletedTasks,
    deleteWorkspace,
} from '@/stores/tasks/tasksActions'
import { setCurrentTask } from '@/stores/tasks/tasksSlice'
import { TASK_STATUS, filterTasks, sortTasksByPriority } from '@/utils/tasksUtils'
import './TasksPage.scss'

const VALID_VIEWS: TaskViewMode[] = ['all', 'today', 'week', 'completed', 'workspaces']

export const TasksPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { user } = useSelector((state: RootState) => state.auth)
    const { tasks, workspaces, filters, currentTask, isLoading } = useSelector(
        (state: RootState) => state.tasks,
    )

    const viewParam = searchParams.get('view') as TaskViewMode | null
    const view: TaskViewMode =
        viewParam && VALID_VIEWS.includes(viewParam) ? viewParam : 'all'

    const [createOpen, setCreateOpen] = useState(false)
    const [createDueDate, setCreateDueDate] = useState<string | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
    const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<number | null>(null)

    useEffect(() => {
        dispatch(fetchTags() as any)
        dispatch(fetchWorkspaces() as any)
        if (view !== 'workspaces') {
            dispatch(fetchTasks() as any)
        }
    }, [dispatch, view])

    const filtered = useMemo(
        () => sortTasksByPriority(filterTasks(tasks, filters)),
        [tasks, filters],
    )

    const setView = (mode: TaskViewMode) => {
        if (mode === 'all') {
            setSearchParams({})
        } else {
            setSearchParams({ view: mode })
        }
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

    const confirmDeleteWorkspace = async () => {
        if (deleteWorkspaceId == null) return
        await dispatch(deleteWorkspace(deleteWorkspaceId) as any)
        setDeleteWorkspaceId(null)
    }

    return (
        <div className="tasks-page">
            <Header />

            <div className="tasks-page__content">
                <TaskTabs active={view} onChange={setView} />

                {view !== 'workspaces' && <TaskFilters />}

                {isLoading && view !== 'workspaces' && !tasks.length ? (
                    <p className="tasks-page__loading">Загрузка задач…</p>
                ) : (
                    <>
                        {view === 'all' && (
                            <AllTasksView
                                tasks={filtered}
                                onAdd={handleAdd}
                                onToggleStatus={handleToggle}
                                onTaskClick={handleTaskClick}
                            />
                        )}
                        {view === 'today' && (
                            <TodayView
                                tasks={filtered}
                                onAdd={() => handleAdd(null)}
                                onToggleStatus={handleToggle}
                                onTaskClick={handleTaskClick}
                            />
                        )}
                        {view === 'week' && (
                            <WeekView
                                tasks={filtered}
                                onAdd={handleAdd}
                                onToggleStatus={handleToggle}
                                onTaskClick={handleTaskClick}
                            />
                        )}
                        {view === 'completed' && (
                            <CompletedView
                                tasks={filtered}
                                onToggleStatus={handleToggle}
                                onTaskClick={handleTaskClick}
                                onDeleteMany={async (ids) => {
                                    await dispatch(deleteCompletedTasks(ids) as any)
                                }}
                            />
                        )}
                        {view === 'workspaces' && (
                            <WorkspacesView
                                workspaces={workspaces}
                                currentUserId={user?.id}
                                onCreate={() => setWorkspaceModalOpen(true)}
                                onDelete={(id) => setDeleteWorkspaceId(id)}
                            />
                        )}
                    </>
                )}
            </div>

            <CreateTaskModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                defaultDueDate={createDueDate}
                workspaceId={null}
            />

            <EditTaskModal
                isOpen={editOpen}
                task={currentTask}
                onClose={() => {
                    setEditOpen(false)
                    dispatch(setCurrentTask(null))
                }}
            />

            <CreateWorkspaceModal
                isOpen={workspaceModalOpen}
                onClose={() => setWorkspaceModalOpen(false)}
                onCreated={(id) => navigate(`/tasks/workspaces/${id}`)}
            />

            <ConfirmationModal
                isOpen={deleteWorkspaceId !== null}
                onClose={() => setDeleteWorkspaceId(null)}
                onConfirm={confirmDeleteWorkspace}
                title="Удалить пространство?"
                description="Все задачи пространства будут удалены вместе с ним."
                confirmText="Удалить"
                variant="danger"
            />
        </div>
    )
}

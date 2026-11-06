import { api } from './client'
import { unwrapList } from '@/utils'
import type {
    Tag,
    Task,
    Workspace,
    WorkspaceDetail,
    Subtask,
    Comment,
    CreateTaskData,
    CreateWorkspaceData,
} from '@/types'

export const tasksApi = {
    getTags: async () => {
        const response = await api.get<Tag[] | { results: Tag[] }>('/tasks/tags/')
        return { ...response, data: unwrapList<Tag>(response.data) }
    },
    createTag: (data: { title: string; description?: string }) =>
        api.post<Tag>('/tasks/tags/', data),
    updateTag: (id: number, data: Partial<Tag>) =>
        api.put<Tag>(`/tasks/tags/${id}/`, data),
    deleteTag: (id: number) => api.delete(`/tasks/tags/${id}/`),

    getWorkspaces: async () => {
        const response = await api.get<Workspace[] | { results: Workspace[] }>(
            '/tasks/workspaces/',
        )
        return { ...response, data: unwrapList<Workspace>(response.data) }
    },
    getWorkspace: (id: number) => api.get<WorkspaceDetail>(`/tasks/workspaces/${id}/`),
    createWorkspace: (data: CreateWorkspaceData) =>
        api.post<Workspace>('/tasks/workspaces/', data),
    updateWorkspace: (id: number, data: Partial<CreateWorkspaceData>) =>
        api.patch<Workspace>(`/tasks/workspaces/${id}/`, data),
    deleteWorkspace: (id: number) => api.delete(`/tasks/workspaces/${id}/`),
    joinWorkspace: (inviteCode: string) =>
        api.post<Workspace>('/tasks/workspaces/join/', { invite_code: inviteCode }),
    addWorkspaceMember: (workspaceId: number, userId: number, role?: number) =>
        api.post(`/tasks/workspaces/${workspaceId}/add_member/`, {
            user_id: userId,
            role,
        }),
    removeWorkspaceMember: (workspaceId: number, userId: number) =>
        api.delete(`/tasks/workspaces/${workspaceId}/remove_member/${userId}/`),

    getTasks: async () => {
        const response = await api.get<Task[] | { results: Task[] }>('/tasks/tasks/')
        return { ...response, data: unwrapList<Task>(response.data) }
    },
    getPersonalTasks: async () => {
        const response = await api.get<Task[] | { results: Task[] }>('/tasks/tasks/personal/')
        return { ...response, data: unwrapList<Task>(response.data) }
    },
    getWorkspaceTasks: async (workspaceId: number) => {
        const response = await api.get<Task[] | { results: Task[] }>(
            `/tasks/tasks/workspace_tasks/?workspace_id=${workspaceId}`,
        )
        return { ...response, data: unwrapList<Task>(response.data) }
    },
    getTask: (id: number) => api.get<Task>(`/tasks/tasks/${id}/`),
    createTask: (data: CreateTaskData) => api.post<Task>('/tasks/tasks/', data),
    updateTask: (id: number, data: Partial<CreateTaskData> & { status?: number }) =>
        api.patch<Task>(`/tasks/tasks/${id}/`, data),
    deleteTask: (id: number) => api.delete(`/tasks/tasks/${id}/`),
    changeTaskStatus: (id: number, status: number) =>
        api.post(`/tasks/tasks/${id}/change_status/`, { status }),

    getSubtasks: async (taskId?: number) => {
        const response = await api.get<Subtask[] | { results: Subtask[] }>('/tasks/subtasks/', {
            params: taskId ? { parent_task: taskId } : {},
        })
        return { ...response, data: unwrapList<Subtask>(response.data) }
    },
    createSubtask: (data: {
        title: string
        description?: string
        parent_task: number
        assignee?: number | null
    }) => api.post<Subtask>('/tasks/subtasks/', data),
    updateSubtask: (id: number, data: Partial<Subtask>) =>
        api.patch<Subtask>(`/tasks/subtasks/${id}/`, data),
    deleteSubtask: (id: number) => api.delete(`/tasks/subtasks/${id}/`),

    getComments: async (taskId?: number) => {
        const response = await api.get<Comment[] | { results: Comment[] }>('/tasks/comments/', {
            params: taskId ? { task: taskId } : {},
        })
        return { ...response, data: unwrapList<Comment>(response.data) }
    },
    createComment: (data: { task: number; text: string }) =>
        api.post<Comment>('/tasks/comments/', data),
}

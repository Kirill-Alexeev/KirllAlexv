import { api } from './client'
import { unwrapList } from '@/utils'
import type {
    Tag,
    Task,
    Workspace,
    WorkspaceDetail,
    ChangeStatusResponse,
    Comment,
    CreateTaskData,
    CreateWorkspaceData,
    WorkspaceInvitePreview,
} from '@/types'

export const tasksApi = {
    /** Без workspaceId — личные теги, с ним — теги пространства */
    getTags: async (workspaceId?: number | null) => {
        const response = await api.get<Tag[] | { results: Tag[] }>('/tasks/tags/', {
            params: workspaceId ? { workspace_id: workspaceId } : {},
        })
        return { ...response, data: unwrapList<Tag>(response.data) }
    },
    createTag: (data: { title: string; description?: string; workspace?: number | null }) =>
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
    previewWorkspace: (inviteCode: string) =>
        api.get<WorkspaceInvitePreview>('/tasks/workspaces/preview/', {
            params: { invite_code: inviteCode },
        }),
    joinWorkspace: (inviteCode: string) =>
        api.post<Workspace>('/tasks/workspaces/join/', { invite_code: inviteCode }),
    addWorkspaceMember: (workspaceId: number, userId: number, role?: number) =>
        api.post(`/tasks/workspaces/${workspaceId}/add_member/`, {
            user_id: userId,
            role,
        }),
    removeWorkspaceMember: (workspaceId: number, userId: number) =>
        api.delete(`/tasks/workspaces/${workspaceId}/remove_member/${userId}/`),
    setWorkspaceMemberRole: (workspaceId: number, userId: number, role: number) =>
        api.post(`/tasks/workspaces/${workspaceId}/set_role/`, { user_id: userId, role }),
    transferWorkspaceOwnership: (workspaceId: number, userId: number) =>
        api.post<WorkspaceDetail>(`/tasks/workspaces/${workspaceId}/transfer_ownership/`, {
            user_id: userId,
        }),
    leaveWorkspace: (workspaceId: number, newOwnerId?: number | null) =>
        api.post(`/tasks/workspaces/${workspaceId}/leave/`, {
            new_owner_id: newOwnerId ?? null,
        }),

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
        api.post<ChangeStatusResponse>(`/tasks/tasks/${id}/change_status/`, { status }),
    getSubtasks: (taskId: number) => api.get<Task[]>(`/tasks/tasks/${taskId}/subtasks/`),
    markCommentsRead: (id: number) =>
        api.post<Task>(`/tasks/tasks/${id}/mark_comments_read/`),

    getComments: async (taskId?: number) => {
        const response = await api.get<Comment[] | { results: Comment[] }>('/tasks/comments/', {
            params: taskId ? { task: taskId } : {},
        })
        return { ...response, data: unwrapList<Comment>(response.data) }
    },
    createComment: (data: { task: number; text: string }) =>
        api.post<Comment>('/tasks/comments/', data),
    deleteComment: (id: number) => api.delete(`/tasks/comments/${id}/`),
}

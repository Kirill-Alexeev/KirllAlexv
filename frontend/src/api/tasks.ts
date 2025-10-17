// API запросы для планировщика задач
import { api } from './client'

// Интерфейс тега
export interface Tag {
    id: number
    title: string
    description: string
    user: number
}

// Интерфейс рабочего просранства
export interface Workspace {
    id: number
    title: string
    description: string
    owner: number
    created_at: string
    updated_at: string
    members_count: number
}

// Интерфейс задачи
export interface Task {
    id: number
    title: string
    description: string
    owner: number
    workspace: number | null
    due_date: string | null
    deadline: string | null
    status: number
    priority: number
    tags: Tag[]
    assignees: number[]
    created_at: string
    updated_at: string
    is_overdue: boolean
    is_personal: boolean
    subtasks_count: number
    comments_count: number
}

// Интерфейс подзадачи
export interface Subtask {
    id: number
    title: string
    description: string
    status: number
    parent_task: number
    assignee: number | null
    created_at: string
}

// Интерфейс комментария
export interface Comment {
    id: number
    task: number
    author: number
    text: string
    created_at: string
    updated_at: string
}

// Работа с API задач
export const tasksApi = {
    // Tags
    // Получение тегов
    getTags: () => api.get<Tag[]>('/tasks/tags/'),

    // Создание тега
    createTag: (data: Omit<Tag, 'id' | 'user'>) =>
        api.post<Tag>('/tasks/tags/', data),

    // Изменение тега
    updateTag: (id: number, data: Partial<Tag>) =>
        api.put<Tag>(`/tasks/tags/${id}/`, data),

    // Удаление тега
    deleteTag: (id: number) => api.delete(`/tasks/tags/${id}/`),

    // Workspaces
    // Получение всех рабочих пространств
    getWorkspaces: () => api.get<Workspace[]>('/tasks/workspaces/'),

    // Получение рабочего пространства по id
    getWorkspace: (id: number) => api.get<Workspace>(`/tasks/workspaces/${id}/`),

    // Создание рабочего пространства
    createWorkspace: (data: Omit<Workspace, 'id' | 'owner' | 'created_at' | 'updated_at' | 'members_count'>) =>
        api.post<Workspace>('/tasks/workspaces/', data),

    // Tasks
    // Получение задач
    getTasks: () => api.get<Task[]>('/tasks/tasks/'),

    // Получение личных задач пользователя
    getPersonalTasks: () => api.get<Task[]>('/tasks/tasks/personal/'),

    // Получение задач из рабочего пространства
    getWorkspaceTasks: (workspaceId: number) =>
        api.get<Task[]>(`/tasks/tasks/workspace_tasks/?workspace_id=${workspaceId}`),

    // Получение задачи по id
    getTask: (id: number) => api.get<Task>(`/tasks/tasks/${id}/`),

    // Создание задачи
    createTask: (data: Omit<Task, 'id' | 'owner' | 'created_at' | 'updated_at' | 'is_overdue' | 'is_personal' | 'subtasks_count' | 'comments_count'>) =>
        api.post<Task>('/tasks/tasks/', data),

    // Изменение задачи
    updateTask: (id: number, data: Partial<Task>) =>
        api.put<Task>(`/tasks/tasks/${id}/`, data),

    // Удаление задачи
    deleteTask: (id: number) => api.delete(`/tasks/tasks/${id}/`),

    // Изменение статуса задачи
    changeTaskStatus: (id: number, status: number) =>
        api.post(`/tasks/tasks/${id}/change_status/`, { status }),

    // Subtasks
    // Получение подзадач
    getSubtasks: () => api.get<Subtask[]>('/tasks/subtasks/'),

    // Создание подзадачи
    createSubtask: (data: Omit<Subtask, 'id' | 'created_at'>) =>
        api.post<Subtask>('/tasks/subtasks/', data),

    // Comments
    // Получение комментариев
    getComments: () => api.get<Comment[]>('/tasks/comments/'),

    // Создание комментария
    createComment: (data: Omit<Comment, 'id' | 'author' | 'created_at' | 'updated_at'>) =>
        api.post<Comment>('/tasks/comments/', data),
}
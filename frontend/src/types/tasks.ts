import type { User } from './auth'

export interface Tag {
    id: number
    title: string
    description: string
    user: number
    /** null — личный тег пользователя, иначе тег рабочего пространства */
    workspace: number | null
}

export interface WorkspaceInvitePreview {
    id: number
    title: string
    description: string
    owner: Pick<User, 'id' | 'username' | 'first_name' | 'last_name'>
    members_count: number
    invite_code: string
    is_member: boolean
}

export const WORKSPACE_ROLE = {
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
} as const

export interface WorkspaceMembership {
    id: number
    user: User
    workspace: number
    role: number
    joined_at: string
}

export interface Workspace {
    id: number
    title: string
    description: string
    owner: User
    invite_code: string
    created_at: string
    updated_at: string
    members_count: number
    /** Роль текущего пользователя (1 — участник, 2 — админ, 3 — владелец) */
    my_role: number | null
}

export interface WorkspaceDetail extends Workspace {
    members: WorkspaceMembership[]
}

export interface Task {
    id: number
    title: string
    description: string
    owner: User
    workspace: number | null
    due_date: string | null
    deadline: string | null
    status: number
    priority: number
    tags: Tag[]
    assignees: User[]
    created_at: string
    updated_at: string
    is_overdue: boolean
    is_personal: boolean
    /** id родительской задачи, если это подзадача */
    parent: number | null
    parent_title: string | null
    subtasks_count: number
    completed_subtasks_count: number
    /** Может ли текущий пользователь отметить задачу выполненной / вернуть в работу */
    can_complete: boolean
    comments_count: number
    /** Комментарии других участников, появившиеся после последнего просмотра */
    unread_comments_count: number
    comments_last_read_at: string | null
}

export interface ChangeStatusResponse {
    task: Task
    /** Родительская задача, если её статус изменился вместе с подзадачей */
    parent: Task | null
}

export interface Comment {
    id: number
    task: number
    author: User
    text: string
    created_at: string
    updated_at: string
}

export interface CreateTaskData {
    title: string
    description?: string
    workspace?: number | null
    parent?: number | null
    due_date?: string | null
    deadline?: string | null
    priority?: number
    tags?: number[]
    assignees?: number[]
}

export interface CreateWorkspaceData {
    title: string
    description?: string
}

export type TaskViewMode = 'all' | 'today' | 'week' | 'completed' | 'workspaces'

export interface TaskFiltersState {
    search: string
    priority: number | null
    tagId: number | null
    status: number | null
}

export interface TasksState {
    tasks: Task[]
    workspaces: Workspace[]
    currentWorkspace: WorkspaceDetail | null
    tags: Tag[]
    currentTask: Task | null
    filters: TaskFiltersState
    isLoading: boolean
    error: string | null
}

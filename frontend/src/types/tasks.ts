import type { User } from './auth'

export interface Tag {
    id: number
    title: string
    description: string
    user: number
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
    subtasks_count: number
    comments_count: number
    subtasks?: Subtask[]
}

export interface Subtask {
    id: number
    title: string
    description: string
    status: number
    parent_task: number
    assignee: User | null
    created_at: string
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

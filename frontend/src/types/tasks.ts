export interface Tag {
    id: number
    title: string
    description: string
    user: number
}

export interface Workspace {
    id: number
    title: string
    description: string
    owner: number
    created_at: string
    updated_at: string
    members_count: number
}

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

export interface Subtask {
    id: number
    title: string
    description: string
    status: number
    parent_task: number
    assignee: number | null
    created_at: string
}

export interface Comment {
    id: number
    task: number
    author: number
    text: string
    created_at: string
    updated_at: string
}

export interface TasksState {
    tasks: Task[]
    workspaces: Workspace[]
    tags: Tag[]
    currentTask: Task | null
    isLoading: boolean
    error: string | null
}
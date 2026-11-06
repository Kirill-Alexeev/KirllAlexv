import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
    TasksState,
    Task,
    Subtask,
    Tag,
    Workspace,
    WorkspaceDetail,
    TaskFiltersState,
} from '@/types'

const initialFilters: TaskFiltersState = {
    search: '',
    priority: null,
    tagId: null,
    status: null,
}

const initialState: TasksState = {
    tasks: [],
    workspaces: [],
    currentWorkspace: null,
    tags: [],
    currentTask: null,
    filters: initialFilters,
    isLoading: false,
    error: null,
}

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        setTasks: (state, action: PayloadAction<Task[]>) => {
            state.tasks = Array.isArray(action.payload) ? action.payload : []
        },
        addTask: (state, action: PayloadAction<Task>) => {
            state.tasks.unshift(action.payload)
        },
        updateTask: (state, action: PayloadAction<Task>) => {
            const idx = state.tasks.findIndex(t => t.id === action.payload.id)
            if (idx !== -1) state.tasks[idx] = action.payload
        },
        removeTask: (state, action: PayloadAction<number>) => {
            state.tasks = state.tasks.filter(t => t.id !== action.payload)
        },
        removeTasks: (state, action: PayloadAction<number[]>) => {
            state.tasks = state.tasks.filter(t => !action.payload.includes(t.id))
        },
        setCurrentTask: (state, action: PayloadAction<Task | null>) => {
            state.currentTask = action.payload
        },
        setTags: (state, action: PayloadAction<Tag[]>) => {
            state.tags = Array.isArray(action.payload) ? action.payload : []
        },
        addTag: (state, action: PayloadAction<Tag>) => {
            if (!Array.isArray(state.tags)) state.tags = []
            state.tags.push(action.payload)
        },
        removeTag: (state, action: PayloadAction<number>) => {
            const tagId = action.payload
            state.tags = state.tags.filter(t => t.id !== tagId)
            state.tasks.forEach(task => {
                task.tags = task.tags.filter(t => t.id !== tagId)
            })
            if (state.currentTask) {
                state.currentTask.tags = state.currentTask.tags.filter(t => t.id !== tagId)
            }
            if (state.filters.tagId === tagId) state.filters.tagId = null
        },
        setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
            state.workspaces = Array.isArray(action.payload) ? action.payload : []
        },
        addWorkspace: (state, action: PayloadAction<Workspace>) => {
            if (!Array.isArray(state.workspaces)) state.workspaces = []
            state.workspaces.unshift(action.payload)
        },
        updateWorkspace: (state, action: PayloadAction<Workspace>) => {
            const idx = state.workspaces.findIndex(w => w.id === action.payload.id)
            if (idx !== -1) state.workspaces[idx] = action.payload
        },
        removeWorkspace: (state, action: PayloadAction<number>) => {
            state.workspaces = state.workspaces.filter(w => w.id !== action.payload)
            if (state.currentWorkspace?.id === action.payload) {
                state.currentWorkspace = null
            }
        },
        setCurrentWorkspace: (state, action: PayloadAction<WorkspaceDetail | null>) => {
            state.currentWorkspace = action.payload
        },
        setFilters: (state, action: PayloadAction<Partial<TaskFiltersState>>) => {
            state.filters = { ...state.filters, ...action.payload }
        },
        resetFilters: (state) => {
            state.filters = initialFilters
        },
        addSubtask: (state, action: PayloadAction<{ taskId: number; subtask: Subtask }>) => {
            const task = state.tasks.find(t => t.id === action.payload.taskId)
            if (task) {
                task.subtasks_count += 1
                if (task.subtasks) {
                    task.subtasks.push(action.payload.subtask)
                } else {
                    task.subtasks = [action.payload.subtask]
                }
            }
        },
        updateSubtask: (state, action: PayloadAction<Subtask>) => {
            const task = state.tasks.find(t => t.id === action.payload.parent_task)
            if (task?.subtasks) {
                const idx = task.subtasks.findIndex(s => s.id === action.payload.id)
                if (idx !== -1) task.subtasks[idx] = action.payload
            }
        },
        removeSubtask: (state, action: PayloadAction<{ taskId: number; subtaskId: number }>) => {
            const task = state.tasks.find(t => t.id === action.payload.taskId)
            if (task) {
                task.subtasks_count = Math.max(0, task.subtasks_count - 1)
                if (task.subtasks) {
                    task.subtasks = task.subtasks.filter(s => s.id !== action.payload.subtaskId)
                }
            }
        },
    },
})

export const {
    setLoading,
    setError,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    removeTasks,
    setCurrentTask,
    setTags,
    addTag,
    removeTag,
    setWorkspaces,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    setCurrentWorkspace,
    setFilters,
    resetFilters,
    addSubtask,
    updateSubtask,
    removeSubtask,
} = tasksSlice.actions

export default tasksSlice.reducer

import { Dispatch } from 'redux'
import { tasksApi } from '@/api/tasks'
import { parseApiError } from '@/utils'
import {
    setLoading,
    setError,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    removeTasks,
    setTags,
    addTag,
    removeTag,
    setWorkspaces,
    addWorkspace,
    removeWorkspace,
    setCurrentWorkspace,
    addSubtask,
    updateSubtask,
    removeSubtask,
} from './tasksSlice'
import type { CreateTaskData, CreateWorkspaceData, Subtask, Task } from '@/types'

export const fetchTasks = (workspaceId?: number | null) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))
        const response = workspaceId
            ? await tasksApi.getWorkspaceTasks(workspaceId)
            : await tasksApi.getPersonalTasks()
        dispatch(setTasks(response.data))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
    } finally {
        dispatch(setLoading(false))
    }
}

export const createTask = (data: CreateTaskData) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))
        const response = await tasksApi.createTask(data)
        dispatch(addTask(response.data))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}

export const editTask = (id: number, data: Partial<CreateTaskData> & { status?: number }) =>
    async (dispatch: Dispatch) => {
        try {
            dispatch(setError(null))
            const response = await tasksApi.updateTask(id, data)
            dispatch(updateTask(response.data))
            return response.data
        } catch (error: unknown) {
            dispatch(setError(parseApiError(error)))
            throw error
        }
    }

export const deleteTask = (id: number) => async (dispatch: Dispatch) => {
    try {
        await tasksApi.deleteTask(id)
        dispatch(removeTask(id))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const deleteCompletedTasks = (ids: number[]) => async (dispatch: Dispatch) => {
    try {
        await Promise.all(ids.map(id => tasksApi.deleteTask(id)))
        dispatch(removeTasks(ids))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const changeTaskStatus = (id: number, status: number) => async (dispatch: Dispatch) => {
    try {
        await tasksApi.changeTaskStatus(id, status)
        const response = await tasksApi.getTask(id)
        dispatch(updateTask(response.data))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
    }
}

export const fetchTags = () => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.getTags()
        dispatch(setTags(response.data))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
    }
}

export const createTag = (data: { title: string; description?: string }) =>
    async (dispatch: Dispatch) => {
        try {
            const response = await tasksApi.createTag(data)
            dispatch(addTag(response.data))
            return response.data
        } catch (error: unknown) {
            dispatch(setError(parseApiError(error)))
            throw error
        }
    }

export const deleteTag = (id: number) => async (dispatch: Dispatch) => {
    try {
        await tasksApi.deleteTag(id)
        dispatch(removeTag(id))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const fetchWorkspaces = () => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.getWorkspaces()
        dispatch(setWorkspaces(response.data))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
    }
}

export const fetchWorkspace = (id: number) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        const response = await tasksApi.getWorkspace(id)
        dispatch(setCurrentWorkspace(response.data))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}

export const createWorkspace = (data: CreateWorkspaceData) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.createWorkspace(data)
        dispatch(addWorkspace(response.data))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const deleteWorkspace = (id: number) => async (dispatch: Dispatch) => {
    try {
        await tasksApi.deleteWorkspace(id)
        dispatch(removeWorkspace(id))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const joinWorkspace = (inviteCode: string) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        const response = await tasksApi.joinWorkspace(inviteCode)
        dispatch(addWorkspace(response.data))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}

export const createSubtaskAction = (data: {
    title: string
    description?: string
    parent_task: number
    assignee?: number | null
}) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.createSubtask(data)
        dispatch(addSubtask({ taskId: data.parent_task, subtask: response.data }))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const editSubtask = (id: number, data: Partial<Subtask>) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.updateSubtask(id, data)
        dispatch(updateSubtask(response.data))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const deleteSubtask = (id: number, taskId: number) => async (dispatch: Dispatch) => {
    try {
        await tasksApi.deleteSubtask(id)
        dispatch(removeSubtask({ taskId, subtaskId: id }))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export type { Task }

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
} from './tasksSlice'
import type { CreateTaskData, CreateWorkspaceData, Task } from '@/types'

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

/** Возвращает {task, parent}; parent — если вместе с подзадачей закрылась/открылась задача */
export const changeTaskStatus = (id: number, status: number) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.changeTaskStatus(id, status)
        dispatch(updateTask(response.data.task))
        if (response.data.parent) dispatch(updateTask(response.data.parent))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
        throw error
    }
}

export const fetchTags = (workspaceId?: number | null) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.getTags(workspaceId)
        dispatch(setTags(response.data))
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
    }
}

export const createTag = (data: { title: string; description?: string; workspace?: number | null }) =>
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

/** Перечитать задачу (например, после нового комментария) */
export const refreshTask = (id: number) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.getTask(id)
        dispatch(updateTask(response.data))
        return response.data
    } catch (error: unknown) {
        dispatch(setError(parseApiError(error)))
    }
}

export const markCommentsRead = (id: number) => async (dispatch: Dispatch) => {
    try {
        const response = await tasksApi.markCommentsRead(id)
        dispatch(updateTask(response.data))
    } catch {
        // не критично: счётчик просто останется
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

/** Обновить пространство и список пространств после изменения состава */
const refreshWorkspace = async (dispatch: Dispatch, id: number) => {
    const [detail, list] = await Promise.all([
        tasksApi.getWorkspace(id),
        tasksApi.getWorkspaces(),
    ])
    dispatch(setCurrentWorkspace(detail.data))
    dispatch(setWorkspaces(list.data))
}

export const setWorkspaceMemberRole = (workspaceId: number, userId: number, role: number) =>
    async (dispatch: Dispatch) => {
        try {
            await tasksApi.setWorkspaceMemberRole(workspaceId, userId, role)
            await refreshWorkspace(dispatch, workspaceId)
        } catch (error: unknown) {
            dispatch(setError(parseApiError(error)))
            throw error
        }
    }

export const transferWorkspaceOwnership = (workspaceId: number, userId: number) =>
    async (dispatch: Dispatch) => {
        try {
            await tasksApi.transferWorkspaceOwnership(workspaceId, userId)
            await refreshWorkspace(dispatch, workspaceId)
        } catch (error: unknown) {
            dispatch(setError(parseApiError(error)))
            throw error
        }
    }

export const removeWorkspaceMember = (workspaceId: number, userId: number) =>
    async (dispatch: Dispatch) => {
        try {
            await tasksApi.removeWorkspaceMember(workspaceId, userId)
            await refreshWorkspace(dispatch, workspaceId)
        } catch (error: unknown) {
            dispatch(setError(parseApiError(error)))
            throw error
        }
    }

export const leaveWorkspace = (workspaceId: number, newOwnerId?: number | null) =>
    async (dispatch: Dispatch) => {
        try {
            await tasksApi.leaveWorkspace(workspaceId, newOwnerId)
            dispatch(removeWorkspace(workspaceId))
        } catch (error: unknown) {
            dispatch(setError(parseApiError(error)))
            throw error
        }
    }

export type { Task }

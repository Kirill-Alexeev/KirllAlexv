import { Dispatch } from 'redux'
import { notesApi } from '@/api/notes'
import { parseApiError } from '@/utils'
import type { Note, NoteSaveData, NoteTag, NotesFiltersState } from '@/types'
import {
    addNoteTag,
    removeNoteFromList,
    removeNoteTag,
    setNoteTags,
    setNotes,
    setNotesError,
    setNotesLoading,
    upsertNote,
} from './notesSlice'

// При быстром наборе в поиске учитываем только последний запрос
let lastRequestId = 0

export const fetchNotes = (filters: NotesFiltersState) => async (dispatch: Dispatch) => {
    const requestId = ++lastRequestId
    dispatch(setNotesLoading(true))
    dispatch(setNotesError(null))
    try {
        const response = await notesApi.getNotes(filters)
        if (requestId === lastRequestId) dispatch(setNotes(response.data))
    } catch (error: unknown) {
        if (requestId === lastRequestId) dispatch(setNotesError(parseApiError(error)))
    } finally {
        if (requestId === lastRequestId) dispatch(setNotesLoading(false))
    }
}

export const fetchNoteTags = () => async (dispatch: Dispatch) => {
    try {
        const response = await notesApi.getTags()
        dispatch(setNoteTags(response.data))
    } catch (error: unknown) {
        dispatch(setNotesError(parseApiError(error)))
    }
}

export const createNote = (data: NoteSaveData = {}) =>
    async (dispatch: Dispatch): Promise<Note> => {
        const response = await notesApi.createNote(data)
        dispatch(upsertNote(response.data))
        return response.data
    }

export const saveNote = (id: number, data: NoteSaveData) =>
    async (dispatch: Dispatch): Promise<Note> => {
        const response = await notesApi.updateNote(id, data)
        dispatch(upsertNote(response.data))
        return response.data
    }

export const removeNote = (id: number) => async (dispatch: Dispatch) => {
    await notesApi.deleteNote(id)
    dispatch(removeNoteFromList(id))
}

export const createNoteTag = (title: string) =>
    async (dispatch: Dispatch): Promise<NoteTag> => {
        const response = await notesApi.createTag(title)
        dispatch(addNoteTag(response.data))
        return response.data
    }

export const deleteNoteTag = (id: number) => async (dispatch: Dispatch) => {
    await notesApi.deleteTag(id)
    dispatch(removeNoteTag(id))
}

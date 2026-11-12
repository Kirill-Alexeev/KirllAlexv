import { api } from './client'
import type { Note, NoteImage, NoteListItem, NoteSaveData, NoteTag, NotesFiltersState } from '@/types'

export const notesApi = {
    getNotes: ({ search, tagId }: NotesFiltersState) =>
        api.get<NoteListItem[]>('/notes/notes/', {
            params: {
                ...(search.trim() ? { search: search.trim() } : {}),
                ...(tagId ? { tag: tagId } : {}),
            },
        }),
    getNote: (id: number) => api.get<Note>(`/notes/notes/${id}/`),
    createNote: (data: NoteSaveData) => api.post<Note>('/notes/notes/', data),
    updateNote: (id: number, data: NoteSaveData) => api.patch<Note>(`/notes/notes/${id}/`, data),
    deleteNote: (id: number) => api.delete(`/notes/notes/${id}/`),
    uploadImage: (noteId: number, file: File) => {
        const form = new FormData()
        form.append('image', file)
        return api.post<NoteImage>(`/notes/notes/${noteId}/images/`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },

    getTags: () => api.get<NoteTag[]>('/notes/tags/'),
    createTag: (title: string) => api.post<NoteTag>('/notes/tags/', { title }),
    deleteTag: (id: number) => api.delete(`/notes/tags/${id}/`),
}

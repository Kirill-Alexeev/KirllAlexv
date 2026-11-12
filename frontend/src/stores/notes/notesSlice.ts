import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { NoteListItem, NoteTag, NotesFiltersState, NotesState } from '@/types'

const initialFilters: NotesFiltersState = {
    search: '',
    tagId: null,
}

const initialState: NotesState = {
    notes: [],
    tags: [],
    filters: initialFilters,
    isLoading: false,
    error: null,
}

const byUpdatedDesc = (a: NoteListItem, b: NoteListItem) =>
    b.updated_at.localeCompare(a.updated_at) || b.id - a.id

const sortTags = (tags: NoteTag[]) =>
    [...tags].sort((a, b) => a.title.localeCompare(b.title, 'ru'))

const notesSlice = createSlice({
    name: 'notes',
    initialState,
    reducers: {
        setNotesLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setNotesError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        setNotes: (state, action: PayloadAction<NoteListItem[]>) => {
            state.notes = action.payload
        },
        /** Новая или изменённая заметка: список отсортирован по времени изменения */
        upsertNote: (state, action: PayloadAction<NoteListItem>) => {
            const { id, title, preview, cover, tags, created_at, updated_at } = action.payload
            const item = { id, title, preview, cover, tags, created_at, updated_at }
            const rest = state.notes.filter(n => n.id !== id)
            state.notes = [item, ...rest].sort(byUpdatedDesc)
        },
        removeNoteFromList: (state, action: PayloadAction<number>) => {
            state.notes = state.notes.filter(n => n.id !== action.payload)
        },
        setNoteTags: (state, action: PayloadAction<NoteTag[]>) => {
            state.tags = sortTags(action.payload)
        },
        addNoteTag: (state, action: PayloadAction<NoteTag>) => {
            state.tags = sortTags([...state.tags, action.payload])
        },
        removeNoteTag: (state, action: PayloadAction<number>) => {
            state.tags = state.tags.filter(t => t.id !== action.payload)
            state.notes.forEach(note => {
                note.tags = note.tags.filter(t => t.id !== action.payload)
            })
            if (state.filters.tagId === action.payload) state.filters.tagId = null
        },
        setNotesFilters: (state, action: PayloadAction<Partial<NotesFiltersState>>) => {
            state.filters = { ...state.filters, ...action.payload }
        },
        resetNotesFilters: (state) => {
            state.filters = initialFilters
        },
    },
})

export const {
    setNotesLoading,
    setNotesError,
    setNotes,
    upsertNote,
    removeNoteFromList,
    setNoteTags,
    addNoteTag,
    removeNoteTag,
    setNotesFilters,
    resetNotesFilters,
} = notesSlice.actions

export default notesSlice.reducer

export interface NoteTag {
    id: number
    title: string
}

export interface NoteImage {
    id: number
    url: string
}

/** Заметка в списке: без полного текста */
export interface NoteListItem {
    id: number
    title: string
    preview: string
    /** Первое фото в тексте */
    cover: string | null
    tags: NoteTag[]
    created_at: string
    updated_at: string
}

export interface Note extends NoteListItem {
    /** Очищенный HTML: <p>, <b>, <i>, <u>, списки, <figure> с фото */
    content: string
    images: NoteImage[]
}

export interface NoteSaveData {
    title?: string
    content?: string
    tag_ids?: number[]
}

export interface NotesFiltersState {
    search: string
    tagId: number | null
}

export interface NotesState {
    notes: NoteListItem[]
    tags: NoteTag[]
    filters: NotesFiltersState
    isLoading: boolean
    error: string | null
}

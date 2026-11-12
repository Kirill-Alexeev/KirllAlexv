import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/stores'
import type { NoteTag } from '@/types'
import { setNotesFilters } from '@/stores/notes/notesSlice'
import { deleteNoteTag } from '@/stores/notes/notesActions'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import closeIcon from '@/assets/icons/close.svg'
import searchIcon from '@/assets/icons/search.svg'
import './NoteFilters.scss'

/** Поиск по заметкам и фильтр по тегу. Тут же можно удалить тег */
export const NoteFilters: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const { filters, tags } = useSelector((state: RootState) => state.notes)
    const [tagToDelete, setTagToDelete] = useState<NoteTag | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const confirmDelete = async () => {
        if (!tagToDelete) return
        setIsDeleting(true)
        try {
            await dispatch(deleteNoteTag(tagToDelete.id))
            setTagToDelete(null)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="note-filters">
            <div className="note-filters__search">
                <input
                    type="search"
                    placeholder="Поиск по заметкам"
                    value={filters.search}
                    onChange={(e) => dispatch(setNotesFilters({ search: e.target.value }))}
                    aria-label="Поиск по заметкам"
                />
                <img src={searchIcon} alt="" className="note-filters__search-icon" />
            </div>

            {tags.length > 0 && (
                <div className="note-filters__tags" role="group" aria-label="Фильтр по тегу">
                    <button
                        type="button"
                        className={`note-filters__tag ${filters.tagId === null ? 'note-filters__tag--active' : ''}`}
                        onClick={() => dispatch(setNotesFilters({ tagId: null }))}
                    >
                        Все
                    </button>
                    {tags.map(tag => (
                        <span
                            key={tag.id}
                            className={`note-filters__tag ${filters.tagId === tag.id ? 'note-filters__tag--active' : ''}`}
                        >
                            <button
                                type="button"
                                className="note-filters__tag-name"
                                onClick={() => dispatch(setNotesFilters({
                                    tagId: filters.tagId === tag.id ? null : tag.id,
                                }))}
                            >
                                #{tag.title}
                            </button>
                            <button
                                type="button"
                                className="note-filters__tag-delete"
                                onClick={() => setTagToDelete(tag)}
                                aria-label={`Удалить тег ${tag.title}`}
                                title="Удалить тег"
                            >
                                <img src={closeIcon} alt="" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <ConfirmationModal
                isOpen={tagToDelete !== null}
                onClose={() => setTagToDelete(null)}
                onConfirm={confirmDelete}
                title="Удалить тег?"
                description={`Тег «#${tagToDelete?.title ?? ''}» будет удалён и снят со всех заметок.`}
                confirmText="Удалить"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    )
}

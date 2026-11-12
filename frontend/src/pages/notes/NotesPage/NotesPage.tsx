import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/stores'
import { Header } from '@/components/Home/Header/Header'
import { Button } from '@/components/ui'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import { EmptyState } from '@/components/tasks/EmptyState/EmptyState'
import { NoteCard } from '@/components/notes/NoteCard/NoteCard'
import { NoteFilters } from '@/components/notes/NoteFilters/NoteFilters'
import { NoteEditor, type NoteEditorHandle } from '@/features/notes/NoteEditor/NoteEditor'
import { createNote, fetchNoteTags, fetchNotes, removeNote } from '@/stores/notes/notesActions'
import { resetNotesFilters } from '@/stores/notes/notesSlice'
import { parseApiError } from '@/utils'
import addIcon from '@/assets/icons/add.svg'
import './NotesPage.scss'

const SEARCH_DELAY = 300

export const NotesPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const [searchParams, setSearchParams] = useSearchParams()
    const { notes, filters, isLoading, error } = useSelector((state: RootState) => state.notes)

    const selectedId = Number(searchParams.get('note')) || null
    const wantsNew = searchParams.get('new') === '1'

    const editorRef = useRef<NoteEditorHandle>(null)
    const creatingRef = useRef(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [actionError, setActionError] = useState('')

    useEffect(() => {
        dispatch(fetchNoteTags())
        return () => {
            dispatch(resetNotesFilters())
        }
    }, [dispatch])

    useEffect(() => {
        const timer = window.setTimeout(
            () => dispatch(fetchNotes(filters)),
            filters.search ? SEARCH_DELAY : 0,
        )
        return () => window.clearTimeout(timer)
    }, [dispatch, filters])

    /** Перед переходом к другой заметке: пустую удаляем, остальное сохраняем */
    const leaveCurrent = useCallback(async () => {
        const editor = editorRef.current
        if (!editor || !selectedId) return
        if (editor.isEmpty()) {
            editor.discard()
            await dispatch(removeNote(selectedId)).catch(() => undefined)
        } else {
            await editor.flush()
        }
    }, [dispatch, selectedId])

    const openNote = async (id: number | null) => {
        if (id === selectedId) return
        setActionError('')
        await leaveCurrent()
        setSearchParams(id ? { note: String(id) } : {})
    }

    const handleCreate = useCallback(async () => {
        if (creatingRef.current) return
        creatingRef.current = true
        setActionError('')
        try {
            await leaveCurrent()
            // Новая заметка сразу попадает в выбранный фильтр по тегу
            const note = await dispatch(createNote(
                filters.tagId ? { tag_ids: [filters.tagId] } : {},
            ))
            setSearchParams({ note: String(note.id) })
        } catch (e) {
            setActionError(parseApiError(e))
            setSearchParams({})
        } finally {
            creatingRef.current = false
        }
    }, [dispatch, filters.tagId, leaveCurrent, setSearchParams])

    // Быстрое действие из сайдбара: /notes?new=1
    useEffect(() => {
        if (wantsNew) handleCreate()
    }, [wantsNew, handleCreate])

    const confirmDelete = async () => {
        if (!selectedId) return
        setIsDeleting(true)
        try {
            editorRef.current?.discard()
            await dispatch(removeNote(selectedId))
            setDeleteOpen(false)
            setSearchParams({})
        } catch (e) {
            setActionError(parseApiError(e))
            setDeleteOpen(false)
        } finally {
            setIsDeleting(false)
        }
    }

    const hasFilters = Boolean(filters.search.trim() || filters.tagId)

    return (
        <div className={`notes-page ${selectedId ? 'notes-page--editing' : ''}`}>
            <Header />

            <div className="notes-page__layout">
                <aside className="notes-page__sidebar">
                    <div className="notes-page__top">
                        <h1 className="notes-page__title">Заметки</h1>
                        <Button variant="primary" size="md" icon={addIcon} onClick={handleCreate}>
                            Новая заметка
                        </Button>
                    </div>

                    <NoteFilters />

                    {(error || actionError) && (
                        <p className="notes-page__error">{actionError || error}</p>
                    )}

                    {isLoading && !notes.length ? (
                        <p className="notes-page__hint">Загрузка заметок…</p>
                    ) : notes.length === 0 ? (
                        hasFilters ? (
                            <p className="notes-page__hint">Ничего не найдено</p>
                        ) : (
                            <EmptyState
                                title="Заметок пока нет"
                                description="Списки покупок, идеи, конспекты — всё можно хранить здесь"
                                actionLabel="Создать заметку"
                                onAction={handleCreate}
                            />
                        )
                    ) : (
                        <ul className="notes-page__list">
                            {notes.map(note => (
                                <li key={note.id}>
                                    <NoteCard
                                        note={note}
                                        isActive={note.id === selectedId}
                                        onClick={() => openNote(note.id)}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <section className="notes-page__editor">
                    {selectedId ? (
                        <NoteEditor
                            key={selectedId}
                            ref={editorRef}
                            noteId={selectedId}
                            onDelete={() => setDeleteOpen(true)}
                            onBack={() => openNote(null)}
                        />
                    ) : (
                        <EmptyState
                            title="Выберите заметку"
                            description="Откройте заметку из списка слева или создайте новую"
                            actionLabel="Новая заметка"
                            onAction={handleCreate}
                        />
                    )}
                </section>
            </div>

            <ConfirmationModal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="Удалить заметку?"
                description="Заметка и все фото в ней будут удалены без возможности восстановления."
                confirmText="Удалить"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    )
}

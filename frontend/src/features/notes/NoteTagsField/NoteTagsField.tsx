import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import type { NoteTag } from '@/types'
import { parseFieldErrors } from '@/utils'
import addIcon from '@/assets/icons/add.svg'
import closeIcon from '@/assets/icons/close.svg'
import './NoteTagsField.scss'

interface NoteTagsFieldProps {
    /** Все теги заметок пользователя */
    tags: NoteTag[]
    selectedIds: number[]
    onChange: (ids: number[]) => void
    onCreate: (title: string) => Promise<NoteTag>
}

/** Теги заметки: чипы выбранных и выпадающий список с созданием нового тега */
export const NoteTagsField: React.FC<NoteTagsFieldProps> = ({ tags, selectedIds, onChange, onCreate }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [newTag, setNewTag] = useState('')
    const [error, setError] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const selected = selectedIds
        .map(id => tags.find(tag => tag.id === id))
        .filter((tag): tag is NoteTag => Boolean(tag))
    const available = tags.filter(tag => !selectedIds.includes(tag.id))

    const handleCreate = async () => {
        const title = newTag.trim()
        if (!title) return
        // Уже существующий тег просто выбираем
        const existing = tags.find(tag => tag.title.toLowerCase() === title.toLowerCase())
        if (existing) {
            if (!selectedIds.includes(existing.id)) onChange([...selectedIds, existing.id])
            setNewTag('')
            return
        }
        setIsCreating(true)
        setError('')
        try {
            const tag = await onCreate(title)
            onChange([...selectedIds, tag.id])
            setNewTag('')
        } catch (e) {
            const titleError = parseFieldErrors(e).title
            setError(titleError || 'Не удалось создать тег')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="note-tags" ref={rootRef}>
            {selected.map(tag => (
                <span key={tag.id} className="note-tags__chip">
                    #{tag.title}
                    <button
                        type="button"
                        className="note-tags__chip-remove"
                        onClick={() => onChange(selectedIds.filter(id => id !== tag.id))}
                        aria-label={`Убрать тег ${tag.title}`}
                        title="Убрать тег"
                    >
                        <img src={closeIcon} alt="" />
                    </button>
                </span>
            ))}

            <button
                type="button"
                className={`note-tags__add ${isOpen ? 'note-tags__add--active' : ''}`}
                onClick={() => setIsOpen(v => !v)}
            >
                # Тег
            </button>

            {isOpen && (
                <div className="note-tags__panel">
                    {available.length > 0 ? (
                        <ul className="note-tags__list">
                            {available.map(tag => (
                                <li key={tag.id}>
                                    <button
                                        type="button"
                                        className="note-tags__option"
                                        onClick={() => onChange([...selectedIds, tag.id])}
                                    >
                                        #{tag.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="note-tags__hint">
                            {tags.length ? 'Все теги уже добавлены' : 'Тегов пока нет'}
                        </p>
                    )}

                    <div className="note-tags__new">
                        <input
                            type="text"
                            placeholder="Новый тег"
                            value={newTag}
                            maxLength={50}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleCreate()
                                }
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={addIcon}
                            className="note-tags__new-btn"
                            onClick={handleCreate}
                            disabled={!newTag.trim()}
                            loading={isCreating}
                        >
                            Создать
                        </Button>
                    </div>
                    {error && <p className="note-tags__error">{error}</p>}
                </div>
            )}
        </div>
    )
}

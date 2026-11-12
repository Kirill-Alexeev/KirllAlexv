import React from 'react'
import type { NoteListItem } from '@/types'
import './NoteCard.scss'

interface NoteCardProps {
    note: NoteListItem
    isActive: boolean
    onClick: (note: NoteListItem) => void
}

/** Сегодня — время, в этом году — день и месяц, иначе полная дата */
const formatUpdated = (value: string) => {
    const date = new Date(value)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    })
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, isActive, onClick }) => (
    <button
        type="button"
        className={`note-card ${isActive ? 'note-card--active' : ''}`}
        onClick={() => onClick(note)}
    >
        <div className="note-card__body">
            <h3 className={`note-card__title ${note.title ? '' : 'note-card__title--empty'}`}>
                {note.title || 'Без названия'}
            </h3>
            {note.preview && <p className="note-card__preview">{note.preview}</p>}
            <div className="note-card__footer">
                <time className="note-card__date" dateTime={note.updated_at}>
                    {formatUpdated(note.updated_at)}
                </time>
                {note.tags.map(tag => (
                    <span key={tag.id} className="note-card__tag">#{tag.title}</span>
                ))}
            </div>
        </div>
        {note.cover && <img className="note-card__cover" src={note.cover} alt="" loading="lazy" />}
    </button>
)

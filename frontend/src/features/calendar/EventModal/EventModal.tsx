import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import { removeEvent, saveEvent } from '@/stores/calendar/calendarActions'
import { parseApiError } from '@/utils'
import { toIso, today } from '@/utils/tasksUtils'
import type { CalendarOccurrence } from '@/types'
import './EventModal.scss'

interface EventModalProps {
    isOpen: boolean
    onClose: () => void
    /** Редактируемое событие; без него — создание нового */
    event?: CalendarOccurrence | null
    defaultDate?: string | null
}

export const EventModal: React.FC<EventModalProps> = ({
    isOpen,
    onClose,
    event = null,
    defaultDate = null,
}) => {
    const dispatch = useDispatch()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [isYearly, setIsYearly] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isOpen) return
        setTitle(event?.title ?? '')
        setDescription(event?.description ?? '')
        setDate(event?.source_date ?? defaultDate ?? toIso(today()))
        setIsYearly(event?.is_yearly ?? false)
        setError('')
    }, [isOpen, event, defaultDate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setError('Введите название события')
            return
        }
        setIsSaving(true)
        setError('')
        try {
            await dispatch(saveEvent({
                title: title.trim(),
                description: description.trim(),
                date,
                is_yearly: isYearly,
            }, event ? Number(event.id) : undefined) as any)
            onClose()
        } catch (err) {
            setError(parseApiError(err))
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!event) return
        setError('')
        try {
            await dispatch(removeEvent(Number(event.id)) as any)
            onClose()
        } catch (err) {
            setError(parseApiError(err))
        } finally {
            setConfirmDelete(false)
        }
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                size="md"
                title={event ? 'Редактирование события' : 'Новое событие'}
            >
                <form className="event-modal" onSubmit={handleSubmit}>
                    <label className="event-modal__field">
                        <span>Название</span>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            autoFocus
                        />
                    </label>

                    <label className="event-modal__field">
                        <span>Описание</span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </label>

                    <label className="event-modal__field">
                        <span>Дата</span>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </label>

                    <label className="event-modal__check">
                        <input
                            type="checkbox"
                            checked={isYearly}
                            onChange={(e) => setIsYearly(e.target.checked)}
                        />
                        <span>Повторять каждый год</span>
                    </label>

                    {error && <p className="event-modal__error">{error}</p>}

                    <div className="event-modal__footer">
                        {event && (
                            <Button
                                type="button"
                                variant="danger"
                                className="event-modal__delete"
                                onClick={() => setConfirmDelete(true)}
                            >
                                Удалить
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
                        <Button type="submit" variant="primary" loading={isSaving}>
                            {event ? 'Сохранить' : 'Добавить'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="Удалить событие?"
                description={`Событие «${event?.title ?? ''}» будет удалено${event?.is_yearly ? ' из всех лет' : ''}.`}
                confirmText="Удалить"
                variant="danger"
            />
        </>
    )
}

import React, { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import { parseApiError } from '@/utils'
import type { SidebarActionId } from '@/types'
import checkboxIcon from "../../../../assets/icons/check-mark.svg";
import './AddAction.scss'

interface AddActionProps {
    isOpen: boolean
    onClose: () => void
    selected: SidebarActionId[]
    onSave: (actions: SidebarActionId[]) => Promise<void>
}

const availableActions: { id: string; label: string; enabled: boolean }[] = [
    { id: 'task', label: 'Добавить задачу', enabled: true },
    { id: 'workspace_task', label: 'Добавить задачу в пространство', enabled: true },
    { id: 'event', label: 'Добавить событие', enabled: true },
    { id: 'note', label: 'Добавить заметку', enabled: false },
    { id: 'book', label: 'Добавить книгу', enabled: false },
    { id: 'workout', label: 'Добавить тренировку', enabled: false },
    { id: 'expense', label: 'Добавить расход', enabled: false },
]

export const AddAction: React.FC<AddActionProps> = ({ isOpen, onClose, selected, onSave }) => {
    const [draft, setDraft] = useState<SidebarActionId[]>(selected)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setDraft(selected)
            setError('')
        }
    }, [isOpen, selected])

    const toggle = (id: SidebarActionId) => {
        setDraft(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
    }

    const handleSave = async () => {
        setIsSaving(true)
        setError('')
        try {
            await onSave(draft)
            onClose()
        } catch (e) {
            setError(parseApiError(e))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Доступные действия"
            size="md"
        >
            <div className="add-action">
                <p className="add-action__description">
                    Выберите действия, которые будут отображаться в сайдбаре
                </p>

                <div className="add-action__list">
                    {availableActions.map(action => {
                        const isSelected = draft.includes(action.id as SidebarActionId)
                        return (
                            <label
                                key={action.id}
                                className={[
                                    'add-action__item',
                                    !action.enabled && 'add-action__item--disabled',
                                    isSelected && 'add-action__item--selected',
                                ].filter(Boolean).join(' ')}
                            >
                                <div className="add-action__checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggle(action.id as SidebarActionId)}
                                        disabled={!action.enabled}
                                        className="add-action__checkbox-input"
                                    />
                                    <span className="add-action__checkbox-custom">
                                        {isSelected && <img src={checkboxIcon} alt="" />}
                                    </span>
                                </div>

                                <div className="add-action__content">
                                    <span className="add-action__label">{action.label}</span>
                                    {!action.enabled && (
                                        <span className="add-action__badge">Скоро</span>
                                    )}
                                </div>
                            </label>
                        )
                    })}
                </div>

                {error && <p className="add-action__error">{error}</p>}

                <div className="add-action__footer">
                    <Button variant="outline" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button variant="primary" onClick={handleSave} loading={isSaving}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

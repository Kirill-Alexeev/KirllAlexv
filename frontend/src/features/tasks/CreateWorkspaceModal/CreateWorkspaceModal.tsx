import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import type { RootState } from '@/stores'
import { createWorkspace } from '@/stores/tasks/tasksActions'
import './CreateWorkspaceModal.scss'

interface CreateWorkspaceModalProps {
    isOpen: boolean
    onClose: () => void
    onCreated?: (id: number) => void
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
    isOpen,
    onClose,
    onCreated,
}) => {
    const dispatch = useDispatch()
    const { isLoading } = useSelector((state: RootState) => state.tasks)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setTitle('')
            setDescription('')
            setError('')
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setError('Введите название пространства')
            return
        }

        try {
            const workspace = await dispatch(createWorkspace({
                title: title.trim(),
                description: description.trim(),
            }) as any)
            onCreated?.(workspace.id)
            onClose()
        } catch {
            setError('Не удалось создать пространство')
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Новое рабочее пространство" size="sm">
            <form className="create-workspace-modal" onSubmit={handleSubmit}>
                <label className="create-workspace-modal__field">
                    <span>Название</span>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Команда / проект"
                        autoFocus
                        required
                    />
                </label>
                <label className="create-workspace-modal__field">
                    <span>Описание</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Кратко о пространстве"
                        rows={3}
                    />
                </label>
                {error && <p className="create-workspace-modal__error">{error}</p>}
                <div className="create-workspace-modal__footer">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        Создать
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

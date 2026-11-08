import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import type { WorkspaceInvitePreview } from '@/types'
import { tasksApi } from '@/api/tasks'
import { joinWorkspace } from '@/stores/tasks/tasksActions'
import { WorkspaceInviteCard } from './WorkspaceInviteCard'
import './JoinWorkspaceModal.scss'

interface JoinWorkspaceModalProps {
    isOpen: boolean
    onClose: () => void
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Достаём код из ссылки-приглашения или берём введённый код как есть */
export const extractInviteCode = (value: string): string | null => {
    const match = value.trim().match(UUID_RE)
    return match ? match[0].toLowerCase() : null
}

export const previewErrorMessage = (e: any): string => {
    const status = e?.response?.status
    if (status === 404) return 'Пространство с таким кодом не найдено'
    if (status === 400) return 'Неверный код приглашения'
    return 'Не удалось проверить код. Попробуйте ещё раз'
}

export const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({ isOpen, onClose }) => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [value, setValue] = useState('')
    const [preview, setPreview] = useState<WorkspaceInvitePreview | null>(null)
    const [isChecking, setIsChecking] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setValue('')
            setPreview(null)
            setError('')
        }
    }, [isOpen])

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault()
        const code = extractInviteCode(value)
        if (!code) {
            setError('Вставьте ссылку-приглашение или код вида xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
            return
        }
        setIsChecking(true)
        setError('')
        try {
            const response = await tasksApi.previewWorkspace(code)
            setPreview(response.data)
        } catch (err) {
            setError(previewErrorMessage(err))
        } finally {
            setIsChecking(false)
        }
    }

    const handleAccept = async () => {
        if (!preview) return
        setIsJoining(true)
        setError('')
        try {
            const workspace = await dispatch(joinWorkspace(preview.invite_code) as any)
            onClose()
            navigate(`/tasks/workspaces/${workspace.id}`)
        } catch {
            setError('Не удалось присоединиться. Попробуйте ещё раз')
        } finally {
            setIsJoining(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Присоединиться к пространству"
            className="join-workspace-modal-backdrop"
        >
            {preview ? (
                <WorkspaceInviteCard
                    preview={preview}
                    isJoining={isJoining}
                    error={error}
                    onAccept={handleAccept}
                    onDecline={onClose}
                    onOpen={() => {
                        onClose()
                        navigate(`/tasks/workspaces/${preview.id}`)
                    }}
                />
            ) : (
                <form className="join-workspace-modal" onSubmit={handleCheck}>
                    <label className="join-workspace-modal__field">
                        <span>Ссылка-приглашение или код</span>
                        <input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="https://…/tasks/workspaces/join/… или код"
                            autoFocus
                        />
                    </label>
                    {error && <p className="join-workspace-modal__error">{error}</p>}
                    <div className="join-workspace-modal__footer">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button type="submit" variant="primary" loading={isChecking} disabled={!value.trim()}>
                            Далее
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    )
}

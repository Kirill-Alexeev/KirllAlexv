import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import type { WorkspaceMembership } from '@/types'
import { leaveWorkspace } from '@/stores/tasks/tasksActions'
import { ROLE_LABELS, getMemberName } from '@/utils/tasksUtils'
import { parseApiError } from '@/utils'
import './LeaveWorkspaceModal.scss'

interface LeaveWorkspaceModalProps {
    isOpen: boolean
    onClose: () => void
    onLeft: () => void
    workspaceId: number | null
    workspaceTitle?: string
    /** Владельцу перед выходом нужно выбрать преемника */
    isOwner?: boolean
    members?: WorkspaceMembership[]
    currentUserId?: number
}

export const LeaveWorkspaceModal: React.FC<LeaveWorkspaceModalProps> = ({
    isOpen,
    onClose,
    onLeft,
    workspaceId,
    workspaceTitle,
    isOwner = false,
    members = [],
    currentUserId,
}) => {
    const dispatch = useDispatch()
    const candidates = [...members]
        .filter(m => m.user.id !== currentUserId)
        .sort((a, b) => b.role - a.role)
    const [newOwnerId, setNewOwnerId] = useState<number | ''>('')
    const [isLeaving, setIsLeaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setNewOwnerId(candidates[0]?.user.id ?? '')
            setError('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const ownerAlone = isOwner && candidates.length === 0

    const handleLeave = async () => {
        if (workspaceId == null) return
        if (isOwner && !newOwnerId) {
            setError('Выберите нового владельца')
            return
        }
        setIsLeaving(true)
        setError('')
        try {
            await dispatch(leaveWorkspace(workspaceId, isOwner ? Number(newOwnerId) : null) as any)
            onLeft()
        } catch (e) {
            setError(parseApiError(e))
        } finally {
            setIsLeaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Покинуть пространство"
            className="leave-workspace-modal-backdrop"
        >
            <div className="leave-workspace-modal">
                {ownerAlone ? (
                    <p className="leave-workspace-modal__text">
                        Вы единственный участник «{workspaceTitle}». Передать владение некому —
                        если пространство больше не нужно, удалите его в списке пространств.
                    </p>
                ) : (
                    <>
                        <p className="leave-workspace-modal__text">
                            Вы потеряете доступ к задачам «{workspaceTitle}» и будете сняты
                            с назначенных задач. Вернуться можно по ссылке-приглашению.
                        </p>

                        {isOwner && (
                            <label className="leave-workspace-modal__field">
                                <span>Новый владелец</span>
                                <select
                                    value={newOwnerId}
                                    onChange={(e) => setNewOwnerId(e.target.value ? Number(e.target.value) : '')}
                                >
                                    {candidates.map(m => (
                                        <option key={m.user.id} value={m.user.id}>
                                            {getMemberName(m.user)} — {ROLE_LABELS[m.role]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </>
                )}

                {error && <p className="leave-workspace-modal__error">{error}</p>}

                <div className="leave-workspace-modal__footer">
                    <Button variant="outline" onClick={onClose} disabled={isLeaving}>
                        {ownerAlone ? 'Понятно' : 'Отмена'}
                    </Button>
                    {!ownerAlone && (
                        <Button variant="danger" loading={isLeaving} onClick={handleLeave}>
                            Покинуть
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    )
}

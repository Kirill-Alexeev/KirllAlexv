import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import { DropdownMenu } from '@/components/ui/DropdownMenu/DropdownMenu'
import type { DropdownMenuItem } from '@/components/ui/DropdownMenu/DropdownMenu'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import type { WorkspaceDetail, WorkspaceMembership } from '@/types'
import { WORKSPACE_ROLE } from '@/types'
import {
    removeWorkspaceMember,
    setWorkspaceMemberRole,
    transferWorkspaceOwnership,
} from '@/stores/tasks/tasksActions'
import { ROLE_LABELS, getMemberName } from '@/utils/tasksUtils'
import { parseApiError } from '@/utils'
import './WorkspaceMembersModal.scss'

interface WorkspaceMembersModalProps {
    isOpen: boolean
    onClose: () => void
    workspace: WorkspaceDetail | null
    currentUserId?: number
}

type PendingAction = { userId: number; type: 'transfer' | 'remove' } | null

export const WorkspaceMembersModal: React.FC<WorkspaceMembersModalProps> = ({
    isOpen,
    onClose,
    workspace,
    currentUserId,
}) => {
    const dispatch = useDispatch()
    const [pending, setPending] = useState<PendingAction>(null)
    const [busyUserId, setBusyUserId] = useState<number | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setPending(null)
            setError('')
        }
    }, [isOpen])

    const members = useMemo(
        () => [...(workspace?.members ?? [])].sort((a, b) => b.role - a.role),
        [workspace],
    )
    const myRole = members.find(m => m.user.id === currentUserId)?.role ?? 0
    const isOwner = myRole === WORKSPACE_ROLE.OWNER
    const isAdmin = myRole >= WORKSPACE_ROLE.ADMIN

    if (!workspace) return null

    const run = async (userId: number, action: () => Promise<unknown>) => {
        setBusyUserId(userId)
        setError('')
        try {
            await action()
            setPending(null)
        } catch (e) {
            setError(parseApiError(e))
        } finally {
            setBusyUserId(null)
        }
    }

    const changeRole = (member: WorkspaceMembership, role: number) =>
        run(member.user.id, () =>
            dispatch(setWorkspaceMemberRole(workspace.id, member.user.id, role) as any),
        )

    const transfer = (member: WorkspaceMembership) =>
        run(member.user.id, () =>
            dispatch(transferWorkspaceOwnership(workspace.id, member.user.id) as any),
        )

    const remove = (member: WorkspaceMembership) =>
        run(member.user.id, () =>
            dispatch(removeWorkspaceMember(workspace.id, member.user.id) as any),
        )

    /** Пункты меню «⋮» — только то, что текущему пользователю разрешено */
    const getMenuItems = (member: WorkspaceMembership): DropdownMenuItem[] => {
        const isSelf = member.user.id === currentUserId
        if (isSelf || member.role === WORKSPACE_ROLE.OWNER || !isAdmin) return []
        const isTargetAdmin = member.role === WORKSPACE_ROLE.ADMIN
        // Админ управляет только обычными участниками, владелец — всеми
        if (!isOwner && isTargetAdmin) return []

        const items: DropdownMenuItem[] = [
            isTargetAdmin
                ? { label: 'Снять администратора', onClick: () => changeRole(member, WORKSPACE_ROLE.MEMBER) }
                : { label: 'Назначить администратором', onClick: () => changeRole(member, WORKSPACE_ROLE.ADMIN) },
        ]
        if (isOwner) {
            items.push({
                label: 'Сделать владельцем',
                onClick: () => setPending({ userId: member.user.id, type: 'transfer' }),
            })
        }
        items.push({
            label: 'Удалить из пространства',
            danger: true,
            onClick: () => setPending({ userId: member.user.id, type: 'remove' }),
        })
        return items
    }

    const renderConfirm = (member: WorkspaceMembership) => {
        const busy = busyUserId === member.user.id
        if (pending?.userId === member.user.id) {
            return (
                <div className="members-modal__confirm">
                    <span>
                        {pending.type === 'transfer'
                            ? 'Передать владение? Вы станете администратором.'
                            : 'Удалить из пространства?'}
                    </span>
                    <div className="members-modal__actions">
                        <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={busy}>
                            Нет
                        </Button>
                        <Button
                            size="sm"
                            variant={pending.type === 'remove' ? 'danger' : 'primary'}
                            loading={busy}
                            onClick={() => (pending.type === 'transfer' ? transfer(member) : remove(member))}
                        >
                            Да
                        </Button>
                    </div>
                </div>
            )
        }

        return null
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={`Участники (${members.length})`}
            className="members-modal-backdrop"
        >
            <div className="members-modal">
                <ul className="members-modal__list">
                    {members.map(member => {
                        const isSelf = member.user.id === currentUserId
                        const menuItems = getMenuItems(member)
                        return (
                            <li key={member.id} className="members-modal__item">
                                <Avatar user={member.user} size="md" />
                                <div className="members-modal__info">
                                    <span className="members-modal__name">
                                        {getMemberName(member.user)}
                                        {isSelf && <span className="members-modal__self"> (вы)</span>}
                                    </span>
                                    <span className="members-modal__username">@{member.user.username}</span>
                                </div>
                                <span className={`members-modal__role members-modal__role--${member.role}`}>
                                    {ROLE_LABELS[member.role]}
                                </span>
                                <div className="members-modal__menu">
                                    {menuItems.length > 0 && (
                                        <DropdownMenu
                                            items={menuItems}
                                            label={`Действия: ${getMemberName(member.user)}`}
                                            disabled={busyUserId === member.user.id}
                                        />
                                    )}
                                </div>
                                {renderConfirm(member)}
                            </li>
                        )
                    })}
                </ul>

                {error && <p className="members-modal__error">{error}</p>}
            </div>
        </Modal>
    )
}

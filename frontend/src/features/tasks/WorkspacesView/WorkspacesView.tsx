import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Workspace } from '@/types'
import { Button } from '@/components/ui'
import { EmptyState } from '@/components/tasks/EmptyState/EmptyState'
import { InviteLinkModal } from '@/features/tasks/InviteLinkModal/InviteLinkModal'
import { LeaveWorkspaceModal } from '@/features/tasks/LeaveWorkspaceModal/LeaveWorkspaceModal'
import { JoinWorkspaceModal } from '@/features/tasks/JoinWorkspaceModal/JoinWorkspaceModal'
import { ROLE_LABELS } from '@/utils/tasksUtils'
import addIcon from '@/assets/icons/add.svg'
import './WorkspacesView.scss'

interface WorkspacesViewProps {
    workspaces: Workspace[]
    currentUserId?: number
    onCreate: () => void
    onDelete: (id: number) => void
}

export const WorkspacesView: React.FC<WorkspacesViewProps> = ({
    workspaces,
    currentUserId,
    onCreate,
    onDelete,
}) => {
    const navigate = useNavigate()
    const [inviteWorkspace, setInviteWorkspace] = useState<Workspace | null>(null)
    const [leaveTarget, setLeaveTarget] = useState<Workspace | null>(null)
    const [joinOpen, setJoinOpen] = useState(false)

    const joinModal = <JoinWorkspaceModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />

    if (!workspaces.length) {
        return (
            <>
                <EmptyState
                    title="Нет рабочих пространств"
                    description="Создайте пространство или присоединитесь к существующему по ссылке или коду"
                    actionLabel="Создать пространство"
                    onAction={onCreate}
                    secondaryActionLabel="Присоединиться по коду"
                    onSecondaryAction={() => setJoinOpen(true)}
                />
                {joinModal}
            </>
        )
    }

    return (
        <div className="workspaces-view">
            <header className="workspaces-view__header">
                <div>
                    <h2 className="workspaces-view__title">Рабочие пространства</h2>
                    <p className="workspaces-view__subtitle">
                        Общие доски с доступом по ссылке. Задачи ведут все участники, удалить пространство может только владелец.
                    </p>
                </div>
                <div className="workspaces-view__header-actions">
                    <Button variant="outline" onClick={() => setJoinOpen(true)}>
                        Присоединиться
                    </Button>
                    <Button variant="primary" icon={addIcon} onClick={onCreate}>
                        Создать
                    </Button>
                </div>
            </header>

            <div className="workspaces-view__grid">
                {workspaces.map(workspace => {
                    const isOwner = currentUserId === workspace.owner.id
                    return (
                        <article key={workspace.id} className="workspace-card">
                            <div className="workspace-card__body">
                                <h3 className="workspace-card__title">{workspace.title}</h3>
                                {workspace.description && (
                                    <p className="workspace-card__description">
                                        {workspace.description}
                                    </p>
                                )}
                                <div className="workspace-card__meta">
                                    <span>{workspace.members_count} уч.</span>
                                    <span>
                                        {isOwner ? 'Владелец' : `Владелец: ${workspace.owner.username}`}
                                    </span>
                                    {!isOwner && workspace.my_role && (
                                        <span>Вы: {ROLE_LABELS[workspace.my_role]?.toLowerCase()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="workspace-card__actions">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => navigate(`/tasks/workspaces/${workspace.id}`)}
                                >
                                    Открыть
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInviteWorkspace(workspace)}
                                >
                                    Ссылка
                                </Button>
                                {isOwner ? (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => onDelete(workspace.id)}
                                    >
                                        Удалить
                                    </Button>
                                ) : (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => setLeaveTarget(workspace)}
                                    >
                                        Покинуть
                                    </Button>
                                )}
                            </div>
                        </article>
                    )
                })}
            </div>

            <InviteLinkModal
                isOpen={inviteWorkspace !== null}
                onClose={() => setInviteWorkspace(null)}
                workspaceTitle={inviteWorkspace?.title}
                inviteCode={inviteWorkspace?.invite_code}
            />

            {joinModal}

            <LeaveWorkspaceModal
                isOpen={leaveTarget !== null}
                onClose={() => setLeaveTarget(null)}
                onLeft={() => setLeaveTarget(null)}
                workspaceId={leaveTarget?.id ?? null}
                workspaceTitle={leaveTarget?.title}
            />
        </div>
    )
}

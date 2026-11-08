import React from 'react'
import type { WorkspaceInvitePreview } from '@/types'
import { Button } from '@/components/ui'
import { getMemberName } from '@/utils/tasksUtils'
import './JoinWorkspaceModal.scss'

interface WorkspaceInviteCardProps {
    preview: WorkspaceInvitePreview
    isJoining?: boolean
    error?: string
    onAccept: () => void
    onDecline: () => void
    onOpen: () => void
}

const membersLabel = (n: number) => {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return `${n} участник`
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} участника`
    return `${n} участников`
}

/** Подтверждение вступления в пространство: что это за пространство и кто его владелец */
export const WorkspaceInviteCard: React.FC<WorkspaceInviteCardProps> = ({
    preview,
    isJoining = false,
    error,
    onAccept,
    onDecline,
    onOpen,
}) => (
    <div className="invite-card">
        <p className="invite-card__eyebrow">
            {preview.is_member ? 'Вы уже участник' : 'Вас приглашают в рабочее пространство'}
        </p>
        <h3 className="invite-card__title">{preview.title}</h3>
        {preview.description && <p className="invite-card__description">{preview.description}</p>}
        <div className="invite-card__meta">
            <span>Владелец: {getMemberName(preview.owner)}</span>
            <span>{membersLabel(preview.members_count)}</span>
        </div>

        {error && <p className="invite-card__error">{error}</p>}

        <div className="invite-card__footer">
            {preview.is_member ? (
                <>
                    <Button variant="outline" onClick={onDecline}>Закрыть</Button>
                    <Button variant="primary" onClick={onOpen}>Открыть пространство</Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={onDecline} disabled={isJoining}>
                        Отклонить
                    </Button>
                    <Button variant="primary" onClick={onAccept} loading={isJoining}>
                        Присоединиться
                    </Button>
                </>
            )}
        </div>
    </div>
)

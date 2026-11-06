import React, { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui'
import { getWorkspaceInviteLink } from '@/utils/tasksUtils'
import './InviteLinkModal.scss'

interface InviteLinkModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceTitle?: string
    inviteCode?: string | null
}

export const InviteLinkModal: React.FC<InviteLinkModalProps> = ({
    isOpen,
    onClose,
    workspaceTitle,
    inviteCode,
}) => {
    const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
    const timerRef = useRef<number | null>(null)
    const link = inviteCode ? getWorkspaceInviteLink(String(inviteCode)) : ''

    useEffect(() => {
        if (isOpen) setStatus('idle')
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current)
        }
    }, [isOpen])

    const handleCopy = async () => {
        if (!link) return
        try {
            await navigator.clipboard.writeText(link)
            setStatus('copied')
        } catch {
            setStatus('error')
        }
        if (timerRef.current) window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(() => setStatus('idle'), 2500)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Ссылка-приглашение"
            className="invite-link-modal-backdrop"
        >
            <div className="invite-link-modal">
                <p className="invite-link-modal__hint">
                    {workspaceTitle
                        ? <>Отправьте ссылку участникам, чтобы они присоединились к «{workspaceTitle}».</>
                        : 'Отправьте ссылку участникам, чтобы они присоединились к пространству.'}
                </p>

                <div className="invite-link-modal__link" title={link}>
                    {link}
                </div>

                <div className="invite-link-modal__footer">
                    <span
                        className={`invite-link-modal__status invite-link-modal__status--${status}`}
                        role="status"
                        aria-live="polite"
                    >
                        {status === 'copied' && 'Ссылка скопирована в буфер обмена'}
                        {status === 'error' && 'Не удалось скопировать — выделите ссылку вручную'}
                    </span>
                    <Button type="button" variant="primary" size="sm" onClick={handleCopy}>
                        Скопировать
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

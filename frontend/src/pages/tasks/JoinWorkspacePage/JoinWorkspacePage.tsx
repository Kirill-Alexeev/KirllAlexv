import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Header } from '@/components/Home/Header/Header'
import type { WorkspaceInvitePreview } from '@/types'
import { tasksApi } from '@/api/tasks'
import { joinWorkspace } from '@/stores/tasks/tasksActions'
import { WorkspaceInviteCard } from '@/features/tasks/JoinWorkspaceModal/WorkspaceInviteCard'
import {
    extractInviteCode,
    previewErrorMessage,
} from '@/features/tasks/JoinWorkspaceModal/JoinWorkspaceModal'
import './JoinWorkspacePage.scss'

/** Переход по ссылке-приглашению: сначала показываем пространство и просим подтвердить */
export const JoinWorkspacePage: React.FC = () => {
    const { inviteCode } = useParams<{ inviteCode: string }>()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [preview, setPreview] = useState<WorkspaceInvitePreview | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isJoining, setIsJoining] = useState(false)
    const [loadError, setLoadError] = useState('')
    const [joinError, setJoinError] = useState('')

    useEffect(() => {
        const code = extractInviteCode(inviteCode ?? '')
        if (!code) {
            setLoadError('Неверная ссылка-приглашение')
            setIsLoading(false)
            return
        }
        let cancelled = false
        tasksApi.previewWorkspace(code)
            .then(response => !cancelled && setPreview(response.data))
            .catch(e => !cancelled && setLoadError(previewErrorMessage(e)))
            .finally(() => !cancelled && setIsLoading(false))
        return () => {
            cancelled = true
        }
    }, [inviteCode])

    const handleAccept = async () => {
        if (!preview) return
        setIsJoining(true)
        setJoinError('')
        try {
            const workspace = await dispatch(joinWorkspace(preview.invite_code) as any)
            navigate(`/tasks/workspaces/${workspace.id}`, { replace: true })
        } catch {
            setJoinError('Не удалось присоединиться. Попробуйте ещё раз')
            setIsJoining(false)
        }
    }

    return (
        <div className="join-workspace-page">
            <Header />

            <div className="join-workspace-page__body">
                <div className="join-workspace-page__card">
                    {isLoading && <p>Проверяем приглашение…</p>}

                    {!isLoading && loadError && (
                        <>
                            <h1>Приглашение недействительно</h1>
                            <p className="join-workspace-page__error">{loadError}</p>
                            <Button variant="primary" onClick={() => navigate('/tasks?view=workspaces')}>
                                К пространствам
                            </Button>
                        </>
                    )}

                    {!isLoading && preview && (
                        <WorkspaceInviteCard
                            preview={preview}
                            isJoining={isJoining}
                            error={joinError}
                            onAccept={handleAccept}
                            onDecline={() => navigate('/tasks?view=workspaces', { replace: true })}
                            onOpen={() => navigate(`/tasks/workspaces/${preview.id}`, { replace: true })}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

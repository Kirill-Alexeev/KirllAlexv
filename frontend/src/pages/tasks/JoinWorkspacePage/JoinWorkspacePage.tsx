import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui'
import type { RootState } from '@/stores'
import { joinWorkspace } from '@/stores/tasks/tasksActions'
import './JoinWorkspacePage.scss'

export const JoinWorkspacePage: React.FC = () => {
    const { inviteCode } = useParams<{ inviteCode: string }>()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { isLoading, error } = useSelector((state: RootState) => state.tasks)
    const [localError, setLocalError] = useState('')

    useEffect(() => {
        const join = async () => {
            if (!inviteCode) return
            try {
                const workspace = await dispatch(joinWorkspace(inviteCode) as any)
                navigate(`/tasks/workspaces/${workspace.id}`, { replace: true })
            } catch {
                setLocalError('Не удалось присоединиться. Проверьте ссылку.')
            }
        }
        join()
    }, [inviteCode, dispatch, navigate])

    return (
        <div className="join-workspace-page">
            <div className="join-workspace-page__card">
                <h1>Подключение к пространству</h1>
                {isLoading && <p>Присоединяемся…</p>}
                {(localError || error) && (
                    <>
                        <p className="join-workspace-page__error">{localError || error}</p>
                        <Button variant="primary" onClick={() => navigate('/tasks')}>
                            К задачам
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}

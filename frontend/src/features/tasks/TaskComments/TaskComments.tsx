import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/stores'
import type { Comment, Task } from '@/types'
import { tasksApi } from '@/api/tasks'
import { Button } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import { markCommentsRead, refreshTask } from '@/stores/tasks/tasksActions'
import { getMemberName } from '@/utils/tasksUtils'
import { parseApiError } from '@/utils'
import './TaskComments.scss'

interface TaskCommentsProps {
    task: Task
}

const formatCommentDate = (iso: string): string => {
    const d = new Date(iso)
    const now = new Date()
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === now.toDateString()) return `сегодня, ${time}`
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `вчера, ${time}`
    const date = d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    })
    return `${date}, ${time}`
}

/** Комментарии задачи рабочего пространства. Непрочитанные подсвечиваются */
export const TaskComments: React.FC<TaskCommentsProps> = ({ task }) => {
    const dispatch = useDispatch()
    const { user } = useSelector((state: RootState) => state.auth)
    const [comments, setComments] = useState<Comment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [text, setText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState('')
    // Момент прошлого просмотра фиксируем при открытии, до отметки «прочитано»
    const lastReadRef = useRef<string | null>(task.comments_last_read_at)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        lastReadRef.current = task.comments_last_read_at
        setIsLoading(true)
        setError('')
        tasksApi.getComments(task.id)
            .then(response => {
                if (cancelled) return
                setComments(response.data)
                if (task.unread_comments_count > 0) {
                    dispatch(markCommentsRead(task.id) as any)
                }
            })
            .catch(e => !cancelled && setError(parseApiError(e)))
            .finally(() => !cancelled && setIsLoading(false))
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id])

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    }, [comments.length])

    const isUnread = (comment: Comment) => {
        if (comment.author.id === user?.id) return false
        const lastRead = lastReadRef.current
        return !lastRead || new Date(comment.created_at) > new Date(lastRead)
    }

    const handleSend = async () => {
        const value = text.trim()
        if (!value || isSending) return
        setIsSending(true)
        setError('')
        try {
            const response = await tasksApi.createComment({ task: task.id, text: value })
            setComments(prev => [...prev, response.data])
            setText('')
            dispatch(refreshTask(task.id) as any)
        } catch (e) {
            setError(parseApiError(e))
        } finally {
            setIsSending(false)
        }
    }

    const handleDelete = async (comment: Comment) => {
        try {
            await tasksApi.deleteComment(comment.id)
            setComments(prev => prev.filter(c => c.id !== comment.id))
            dispatch(refreshTask(task.id) as any)
        } catch (e) {
            setError(parseApiError(e))
        }
    }

    const unreadTotal = comments.filter(isUnread).length

    return (
        <section className="task-comments">
            <header className="task-comments__header">
                <h3 className="task-comments__title">
                    Комментарии{comments.length > 0 && ` (${comments.length})`}
                </h3>
                {unreadTotal > 0 && (
                    <span className="task-comments__new-count">новых: {unreadTotal}</span>
                )}
            </header>

            <div className="task-comments__list" ref={listRef}>
                {isLoading && <p className="task-comments__empty">Загрузка…</p>}
                {!isLoading && comments.length === 0 && (
                    <p className="task-comments__empty">Пока нет комментариев</p>
                )}
                {comments.map(comment => {
                    const unread = isUnread(comment)
                    const isMine = comment.author.id === user?.id
                    return (
                        <article
                            key={comment.id}
                            className={`task-comments__item ${unread ? 'task-comments__item--unread' : ''}`}
                        >
                            <Avatar user={comment.author} size="sm" />
                            <div className="task-comments__body">
                                <div className="task-comments__meta">
                                    <span className="task-comments__author">
                                        {getMemberName(comment.author)}
                                        {isMine && <span className="task-comments__self"> (вы)</span>}
                                    </span>
                                    <time
                                        className="task-comments__date"
                                        dateTime={comment.created_at}
                                        title={new Date(comment.created_at).toLocaleString('ru-RU')}
                                    >
                                        {formatCommentDate(comment.created_at)}
                                    </time>
                                    {unread && <span className="task-comments__badge">новый</span>}
                                    {isMine && (
                                        <button
                                            type="button"
                                            className="task-comments__delete"
                                            onClick={() => handleDelete(comment)}
                                        >
                                            Удалить
                                        </button>
                                    )}
                                </div>
                                <p className="task-comments__text">{comment.text}</p>
                            </div>
                        </article>
                    )
                })}
            </div>

            <div className="task-comments__form">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                    placeholder="Написать комментарий… (Ctrl+Enter — отправить)"
                    rows={2}
                />
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={isSending}
                    disabled={!text.trim()}
                    onClick={handleSend}
                >
                    Отправить
                </Button>
            </div>

            {error && <p className="task-comments__error">{error}</p>}
        </section>
    )
}

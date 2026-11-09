import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/stores'
import type { AppNotification } from '@/types'
import { notificationsApi } from '@/api/notifications'
import { setNotifications } from '@/stores/notifications/notificationsSlice'
import { toIso, today } from '@/utils/tasksUtils'
import './NotificationToasts.scss'

const POLL_INTERVAL_MS = 5 * 60 * 1000
const TOAST_LIFETIME_MS = 8000
// В sessionStorage: перезагрузка страницы не считается новым открытием сайта
const GREETED_KEY = 'notifications-greeted'

const pad = (value: number) => String(Math.abs(value)).padStart(2, '0')

/** Текущий момент с часовым поясом браузера: 8 утра у каждого пользователя своё */
const localNow = (): string => {
    const now = new Date()
    const offset = -now.getTimezoneOffset()
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    const zone = `${offset < 0 ? '-' : '+'}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
    return `${toIso(now)}T${time}${zone}`
}

/** При открытии сайта: одно сообщение вместо пачки тостов */
const openingToasts = (unread: AppNotification[]): AppNotification[] => {
    if (unread.length < 2) return unread
    return [{
        ...unread[0],
        key: 'unread-summary',
        title: `Непросмотренных уведомлений: ${unread.length}`,
        message: unread.map(item => item.title).join(', '),
    }]
}

interface ToastProps {
    item: AppNotification
    onClose: (key: string) => void
    onOpen: (key: string) => void
}

const Toast: React.FC<ToastProps> = ({ item, onClose, onOpen }) => {
    useEffect(() => {
        const timer = window.setTimeout(() => onClose(item.key), TOAST_LIFETIME_MS)
        return () => window.clearTimeout(timer)
    }, [item.key, onClose])

    return (
        <div className="notification-toast" role="status">
            <button
                type="button"
                className="notification-toast__body"
                onClick={() => onOpen(item.key)}
                title="Открыть все уведомления"
            >
                <span className="notification-toast__title">{item.title}</span>
                {item.message && <span className="notification-toast__message">{item.message}</span>}
            </button>
            <button
                type="button"
                className="notification-toast__close"
                onClick={() => onClose(item.key)}
                aria-label="Закрыть уведомление"
                title="Закрыть"
            >
                ×
            </button>
        </div>
    )
}

/** Показывает непросмотренное при открытии сайта, а дальше — новые напоминания */
export const NotificationToasts: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const userId = useSelector((state: RootState) => state.auth.user?.id)
    const [toasts, setToasts] = useState<AppNotification[]>([])

    useEffect(() => {
        if (!userId) {
            setToasts([])
            dispatch(setNotifications([]))
            return
        }
        const poll = async (isOpening: boolean) => {
            // Счётчик в сайдбаре нужен, даже если напоминания не загрузились
            const fresh = await notificationsApi.poll(localNow())
                .then(({ data }) => data)
                .catch(() => [] as AppNotification[])
            try {
                const { data: current } = await notificationsApi.getCurrent(toIso(today()))
                dispatch(setNotifications(current))
                const shown = isOpening ? openingToasts(current.filter(item => !item.is_read)) : fresh
                setToasts(prev => [
                    ...prev,
                    ...shown.filter(item => !prev.some(t => t.key === item.key)),
                ])
            } catch {
                // не критично: попробуем при следующем опросе
            }
        }
        // Флаг ставится сразу: StrictMode запускает эффект дважды, а сообщение нужно одно
        const isOpening = !sessionStorage.getItem(GREETED_KEY)
        sessionStorage.setItem(GREETED_KEY, '1')
        poll(isOpening)
        const timer = window.setInterval(() => poll(false), POLL_INTERVAL_MS)
        return () => window.clearInterval(timer)
    }, [dispatch, userId])

    const handleClose = useCallback((key: string) => {
        setToasts(prev => prev.filter(t => t.key !== key))
    }, [])

    const handleOpen = useCallback((key: string) => {
        handleClose(key)
        navigate('/notifications')
    }, [handleClose, navigate])

    if (!toasts.length) return null

    return createPortal(
        <div className="notification-toasts">
            {toasts.map(item => (
                <Toast key={item.key} item={item} onClose={handleClose} onOpen={handleOpen} />
            ))}
        </div>,
        document.body,
    )
}

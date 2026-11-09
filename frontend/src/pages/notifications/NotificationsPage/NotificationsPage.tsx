import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/stores'
import { Header } from '@/components/Home/Header/Header'
import { Button } from '@/components/ui'
import { Toggle } from '@/components/ui/Toggle/Toggle'
import { notificationsApi } from '@/api/notifications'
import {
    deleteNotification,
    fetchNotifications,
    markNotificationsRead,
} from '@/stores/notifications/notificationsActions'
import { parseApiError } from '@/utils'
import type { NotificationPreferences } from '@/types'
import trashIcon from '@/assets/icons/trash.svg'
import './NotificationsPage.scss'

type AppId = keyof NotificationPreferences['apps']

const APPS: { id: AppId; title: string; options: { key: string; label: string }[] }[] = [
    {
        id: 'tasks',
        title: 'To-Do',
        options: [
            { key: 'overdue', label: 'Просроченные задачи' },
            { key: 'today', label: 'Задачи на сегодня' },
        ],
    },
    {
        id: 'calendar',
        title: 'Календарь',
        options: [
            { key: 'holidays', label: 'Праздники' },
            { key: 'today', label: 'События сегодня' },
            { key: 'tomorrow', label: 'События завтра' },
        ],
    },
]

// Приложения ещё не готовы: настройки появятся вместе с ними
const COMING_SOON = ['Заметки', 'Библиотека', 'Тренировки', 'Трекер бюджета']

export const NotificationsPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const current = useSelector((state: RootState) => state.notifications.items)
    const hasUnread = current.some(item => !item.is_read)
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        notificationsApi.getSettings()
            .then(({ data }) => setPrefs(data))
            .catch(e => setError(parseApiError(e)))
        dispatch(fetchNotifications() as any)
            .catch((e: unknown) => setError(parseApiError(e)))
    }, [dispatch])

    // Всё, что показано на открытой странице, считается просмотренным
    useEffect(() => {
        if (!hasUnread) return
        dispatch(markNotificationsRead() as any).catch(() => {
            // не критично: счётчик просто останется
        })
    }, [dispatch, hasUnread])

    const handleDelete = async (key: string) => {
        setError('')
        try {
            await dispatch(deleteNotification(key) as any)
        } catch (e) {
            setError(parseApiError(e))
        }
    }

    const save = async (next: NotificationPreferences) => {
        const previous = prefs
        setPrefs(next)
        setError('')
        try {
            await notificationsApi.saveSettings(next)
            await dispatch(fetchNotifications() as any)
        } catch (e) {
            setPrefs(previous)
            setError(parseApiError(e))
        }
    }

    const setAppOption = (app: AppId, key: string, value: boolean) => {
        if (!prefs) return
        save({
            ...prefs,
            apps: { ...prefs.apps, [app]: { ...prefs.apps[app], [key]: value } },
        })
    }

    return (
        <div className="notifications-page">
            <Header />

            <div className="notifications-page__content">
                <h1 className="notifications-page__title">Уведомления</h1>
                {error && <p className="notifications-page__error">{error}</p>}

                <section className="notifications-page__section">
                    <h2 className="notifications-page__subtitle">Сегодня</h2>
                    {current.length === 0 && (
                        <p className="notifications-page__empty">Новых уведомлений нет</p>
                    )}
                    <ul className="notifications-page__list">
                        {current.map(item => (
                            <li key={item.key} className="notification-row">
                                <div className="notification-row__body">
                                    <p className="notification-row__title">{item.title}</p>
                                    <p className="notification-row__message">{item.message}</p>
                                </div>
                                <div className="notification-row__actions">
                                    <Button size="sm" variant="outline" onClick={() => navigate(item.link)}>
                                        {item.action_label}
                                    </Button>
                                    <button
                                        type="button"
                                        className="notification-row__delete"
                                        onClick={() => handleDelete(item.key)}
                                        aria-label={`Удалить уведомление: ${item.title}`}
                                        title="Удалить уведомление"
                                    >
                                        <img src={trashIcon} alt="" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {prefs && (
                    <section className="notifications-page__section">
                        <h2 className="notifications-page__subtitle">Настройки</h2>

                        <div className="notification-card">
                            <Toggle
                                strong
                                label="Все уведомления"
                                checked={prefs.enabled}
                                onChange={(enabled) => save({ ...prefs, enabled })}
                            />
                        </div>

                        <div className="notifications-page__cards">
                            {APPS.map(app => {
                                const values = prefs.apps[app.id] as unknown as Record<string, boolean>
                                return (
                                    <div key={app.id} className="notification-card">
                                        <Toggle
                                            strong
                                            label={app.title}
                                            checked={values.enabled}
                                            disabled={!prefs.enabled}
                                            onChange={(value) => setAppOption(app.id, 'enabled', value)}
                                        />
                                        <div className="notification-card__options">
                                            {app.options.map(option => (
                                                <Toggle
                                                    key={option.key}
                                                    label={option.label}
                                                    checked={values[option.key]}
                                                    disabled={!prefs.enabled || !values.enabled}
                                                    onChange={(value) => setAppOption(app.id, option.key, value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}

                            {COMING_SOON.map(title => (
                                <div key={title} className="notification-card notification-card--soon">
                                    <span className="notification-card__title">{title}</span>
                                    <span className="notification-card__badge">Скоро</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}

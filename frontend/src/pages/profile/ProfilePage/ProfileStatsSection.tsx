import React, { useEffect, useState } from 'react'
import { authApi } from '@/api/auth'
import { parseApiError } from '@/utils'
import { toIso, today } from '@/utils/tasksUtils'
import type { ProfileStats } from '@/types'

const getTiles = (stats: ProfileStats) => [
    { label: 'Выполнено задач', value: stats.completed },
    { label: 'За 7 дней', value: stats.completed_week },
    { label: 'За 30 дней', value: stats.completed_month },
    { label: 'Процент выполнения', value: `${stats.completion_rate}%` },
    { label: 'Не завершено', value: stats.unfinished },
    { label: 'Просрочено', value: stats.overdue },
    { label: 'Рабочих пространств', value: stats.workspaces },
    { label: 'Событий в календаре', value: stats.events },
]

export const ProfileStatsSection: React.FC = () => {
    const [stats, setStats] = useState<ProfileStats | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        authApi.getProfileStats(toIso(today()))
            .then(({ data }) => setStats(data))
            .catch(e => setError(parseApiError(e)))
    }, [])

    return (
        <section className="profile-page__section">
            <h2 className="profile-page__subtitle">Статистика</h2>
            {error && <p className="profile-page__error">{error}</p>}
            {stats && (
                <dl className="profile-stats">
                    {getTiles(stats).map(tile => (
                        <div key={tile.label} className="profile-stats__tile">
                            <dd className="profile-stats__value">{tile.value}</dd>
                            <dt className="profile-stats__label">{tile.label}</dt>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    )
}

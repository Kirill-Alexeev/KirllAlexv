import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { updateUser } from '@/stores/auth/authSlice'
import { parseApiError, parseFieldErrors } from '@/utils'
import { toIso, today } from '@/utils/tasksUtils'
import type { User } from '@/types'

const toForm = (user: User) => ({
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    phone: user.phone ?? '',
    date_of_birth: user.date_of_birth ?? '',
    bio: user.bio ?? '',
})

const formatDate = (value: string, withTime = false) =>
    // Дата без времени иначе считается в UTC и западнее Гринвича сдвигается на день
    new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })

const getRows = (user: User) => [
    { label: 'Имя', value: user.first_name },
    { label: 'Фамилия', value: user.last_name },
    { label: 'Логин', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'Телефон', value: user.phone },
    { label: 'Дата рождения', value: user.date_of_birth && formatDate(user.date_of_birth) },
    { label: 'О себе', value: user.bio },
    { label: 'Дата регистрации', value: formatDate(user.date_joined) },
    { label: 'Последний вход', value: user.last_login && formatDate(user.last_login, true) },
]

export const ProfileInfo: React.FC<{ user: User }> = ({ user }) => {
    const dispatch = useDispatch()
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState(() => toForm(user))
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [error, setError] = useState('')

    const startEditing = () => {
        setForm(toForm(user))
        setErrors({})
        setError('')
        setIsEditing(true)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target
        setForm(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setIsSaving(true)
        setErrors({})
        setError('')
        try {
            const { data } = await authApi.updateProfile({
                ...form,
                phone: form.phone || null,
                date_of_birth: form.date_of_birth || null,
                bio: form.bio || null,
            })
            dispatch(updateUser(data))
            setIsEditing(false)
        } catch (e) {
            const fields = parseFieldErrors(e)
            setErrors(fields)
            if (!Object.keys(form).some(name => fields[name])) setError(parseApiError(e))
        } finally {
            setIsSaving(false)
        }
    }

    if (!isEditing) {
        return (
            <section className="profile-page__section">
                <div className="profile-page__heading">
                    <h2 className="profile-page__subtitle">Личные данные</h2>
                    <Button size="sm" variant="outline" onClick={startEditing}>Изменить</Button>
                </div>
                <dl className="profile-card profile-info">
                    {getRows(user).map(row => (
                        <div key={row.label} className="profile-info__row">
                            <dt className="profile-info__label">{row.label}</dt>
                            <dd className={`profile-info__value ${row.value ? '' : 'profile-info__value--empty'}`}>
                                {row.value || 'Не указано'}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>
        )
    }

    return (
        <section className="profile-page__section">
            <h2 className="profile-page__subtitle">Личные данные</h2>
            <form className="profile-card profile-form" onSubmit={handleSubmit}>
                <div className="profile-form__grid">
                    <Input label="Имя" name="first_name" value={form.first_name} onChange={handleChange}
                        maxLength={150} autoComplete="given-name" error={errors.first_name} />
                    <Input label="Фамилия" name="last_name" value={form.last_name} onChange={handleChange}
                        maxLength={150} autoComplete="family-name" error={errors.last_name} />
                    <Input label="Логин" name="username" value={form.username} onChange={handleChange}
                        required maxLength={150} autoComplete="username" error={errors.username} />
                    <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange}
                        autoComplete="email" error={errors.email} />
                    <Input label="Телефон" type="tel" name="phone" value={form.phone} onChange={handleChange}
                        maxLength={20} autoComplete="tel" error={errors.phone} />
                    <Input label="Дата рождения" type="date" name="date_of_birth" value={form.date_of_birth}
                        onChange={handleChange} max={toIso(today())} error={errors.date_of_birth} />
                </div>
                <Input label="О себе" type="textarea" name="bio" value={form.bio} onChange={handleChange}
                    maxLength={500} rows={3} error={errors.bio} />
                {error && <p className="profile-page__error">{error}</p>}
                <div className="profile-form__actions">
                    <Button type="submit" size="sm" loading={isSaving}>Сохранить</Button>
                    <Button type="button" size="sm" variant="outline" disabled={isSaving}
                        onClick={() => setIsEditing(false)}>
                        Отмена
                    </Button>
                </div>
            </form>
        </section>
    )
}

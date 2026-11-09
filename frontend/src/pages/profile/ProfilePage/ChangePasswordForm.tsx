import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '@/api/auth'
import { Button, Input } from '@/components/ui'
import { loginSuccess } from '@/stores/auth/authSlice'
import { parseApiError, parseFieldErrors } from '@/utils'
import type { User } from '@/types'

const EMPTY_FORM = { old_password: '', new_password: '', new_password_confirm: '' }

export const ChangePasswordForm: React.FC<{ user: User }> = ({ user }) => {
    const dispatch = useDispatch()
    const [form, setForm] = useState(EMPTY_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [error, setError] = useState('')
    const [isChanged, setIsChanged] = useState(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target
        setForm(prev => ({ ...prev, [name]: value }))
        setIsChanged(false)
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setErrors({})
        setError('')
        if (form.new_password !== form.new_password_confirm) {
            setErrors({ new_password_confirm: 'Пароли не совпадают' })
            return
        }
        setIsSaving(true)
        try {
            const { data } = await authApi.changePassword(form)
            // Старый токен сервер отозвал: без нового следующий запрос выкинет на вход
            dispatch(loginSuccess({ user, token: data.token }))
            setForm(EMPTY_FORM)
            setIsChanged(true)
        } catch (e) {
            const fields = parseFieldErrors(e)
            setErrors(fields)
            if (!Object.keys(EMPTY_FORM).some(name => fields[name])) setError(parseApiError(e))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="profile-page__section">
            <h2 className="profile-page__subtitle">Смена пароля</h2>
            <form className="profile-card profile-form" onSubmit={handleSubmit}>
                <div className="profile-form__grid profile-form__grid--three">
                    <Input label="Текущий пароль" type="password" name="old_password" value={form.old_password}
                        onChange={handleChange} required autoComplete="current-password" error={errors.old_password} />
                    <Input label="Новый пароль" type="password" name="new_password" value={form.new_password}
                        onChange={handleChange} required minLength={8} autoComplete="new-password"
                        error={errors.new_password} />
                    <Input label="Повторите пароль" type="password" name="new_password_confirm"
                        value={form.new_password_confirm} onChange={handleChange} required
                        autoComplete="new-password" error={errors.new_password_confirm} />
                </div>
                {error && <p className="profile-page__error">{error}</p>}
                {isChanged && (
                    <p className="profile-page__success">
                        Пароль изменён. На других устройствах нужно будет войти заново.
                    </p>
                )}
                <div className="profile-form__actions">
                    <Button type="submit" size="sm" loading={isSaving}>Сменить пароль</Button>
                </div>
            </form>
        </section>
    )
}

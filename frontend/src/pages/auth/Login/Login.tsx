import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { loginUser } from '@/stores/auth/authActions'
import { RootState } from '@/stores'
import './Login.scss'

export const Login: React.FC = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth)

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    })

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, navigate])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            await dispatch(loginUser(formData) as any)
            navigate('/')
        } catch (error) {
            // Ошибка обрабатывается в slice
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 className="auth-title">Вход в систему</h1>
                    <p className="auth-subtitle">Введите ваши учетные данные</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <Input
                        type="text"
                        name="username"
                        label="Имя пользователя"
                        placeholder="Введите имя пользователя"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="password"
                        name="password"
                        label="Пароль"
                        placeholder="Введите пароль"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={isLoading}
                        className="auth-submit-btn"
                    >
                        Войти
                    </Button>
                </form>

                <div className="auth-footer">
                    <p>
                        Нет аккаунта?{' '}
                        <Link to="/auth/register" className="auth-link">
                            Зарегистрироваться
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
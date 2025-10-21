import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { RootState } from '@/stores'
import { logoutUser } from '@/stores/auth/authActions'
import './Home.scss'

export const Home: React.FC = () => {
    const dispatch = useDispatch()
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

    const handleLogout = async () => {
        try {
            await dispatch(logoutUser() as any)
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <div className="home-page">
            <header className="home-header">
                <div className="container">
                    <nav className="home-nav">
                        <div className="home-logo">
                            <h1>Многофункциональное приложение</h1>
                        </div>
                        <div className="home-actions">
                            {isAuthenticated ? (
                                <div className="user-menu">
                                    <span className="user-greeting">
                                        Добро пожаловать, {user?.first_name || user?.username}!
                                    </span>
                                    <div className="user-buttons">
                                        <Link to="/tasks">
                                            <Button variant="primary">Перейти к задачам</Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            onClick={handleLogout}
                                            className="logout-btn"
                                        >
                                            Выйти
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="auth-buttons">
                                    <Link to="/auth/login">
                                        <Button variant="outline">Войти</Button>
                                    </Link>
                                    <Link to="/auth/register">
                                        <Button variant="primary">Регистрация</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
            </header>

            <main className="home-main">
                <div className="container">
                    <section className="hero-section">
                        <div className="hero-content">
                            <h2 className="hero-title">
                                Управляйте своей жизнью в одном месте
                            </h2>
                            <p className="hero-description">
                                Многофункциональное приложение для планирования задач,
                                управления бюджетом, организации библиотеки и многого другого.
                                Все инструменты, которые вам нужны, в одном удобном интерфейсе.
                            </p>

                            {!isAuthenticated && (
                                <div className="hero-actions">
                                    <Link to="/auth/register">
                                        <Button size="lg" variant="primary">
                                            Начать бесплатно
                                        </Button>
                                    </Link>
                                    <Link to="/auth/login">
                                        <Button size="lg" variant="outline">
                                            Уже есть аккаунт
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="features-section">
                        <h3 className="features-title">Доступные приложения</h3>
                        <div className="features-grid">
                            <div className="feature-card">
                                <div className="feature-icon">📝</div>
                                <h4 className="feature-name">Планировщик задач</h4>
                                <p className="feature-description">
                                    Организуйте свои задачи, устанавливайте сроки,
                                    назначайте приоритеты и отслеживайте прогресс
                                </p>
                                {isAuthenticated ? (
                                    <Link to="/tasks">
                                        <Button variant="secondary" size="sm">
                                            Открыть
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button variant="secondary" size="sm" disabled>
                                        Войдите для доступа
                                    </Button>
                                )}
                            </div>

                            <div className="feature-card coming-soon">
                                <div className="feature-icon">💰</div>
                                <h4 className="feature-name">Трекер бюджета</h4>
                                <p className="feature-description">
                                    Контролируйте свои финансы, отслеживайте доходы и расходы,
                                    ставьте финансовые цели
                                </p>
                                <Button variant="secondary" size="sm" disabled>
                                    Скоро
                                </Button>
                            </div>

                            <div className="feature-card coming-soon">
                                <div className="feature-icon">📚</div>
                                <h4 className="feature-name">Библиотека</h4>
                                <p className="feature-description">
                                    Каталогизируйте свои книги, отслеживайте прогресс чтения,
                                    составляйте списки желаний
                                </p>
                                <Button variant="secondary" size="sm" disabled>
                                    Скоро
                                </Button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}
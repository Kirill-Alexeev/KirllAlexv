import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/stores'
import { authApi } from '@/api/auth'
import type { SidebarActionId } from '@/types'
import { Button, Link } from '@/components/ui'
import logoIcon from "../../../assets/icons/logo.svg";
import sidebarCloseIcon from "../../../assets/icons/sidebar-close.svg";
import sidebarOpenIcon from "../../../assets/icons/sidebar-open.svg";
import notificationOnIcon from "../../../assets/icons/notification-on.svg";
import calendarIcon from "../../../assets/icons/calendar.svg";
import addIcon from "../../../assets/icons/add.svg";
import settingsIcon from "../../../assets/icons/settings.svg";
import gitHubIcon from "../../../assets/icons/github.svg";
import profileSettingsIcon from "../../../assets/icons/more.svg";
import logInIcon from "../../../assets/icons/log-in.svg";
import { AddAction } from '@/components/ui/Sidebar/AddAction/AddAction'
import { AppSettings } from '@/components/ui/Sidebar/AppSettings/AppSettings'
import { ProfileSettings } from '@/components/ui/Sidebar/ProfileSettings/ProfileSettings'
import { SidebarQuickActions } from './SidebarQuickActions'
import './Sidebar.scss'

export const Sidebar: React.FC = () => {
    const navigate = useNavigate()
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
    const unreadCount = useSelector((state: RootState) =>
        state.notifications.items.filter(item => !item.is_read).length)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showAddAction, setShowAddAction] = useState(false)
    const [showAppSettings, setShowAppSettings] = useState(false)
    const [showProfileSettings, setShowProfileSettings] = useState(false)
    const [quickActions, setQuickActions] = useState<SidebarActionId[]>([])

    useEffect(() => {
        if (!isAuthenticated) {
            setQuickActions([])
            return
        }
        authApi.getSidebarActions()
            .then(({ data }) => setQuickActions(data.actions))
            .catch(() => setQuickActions([]))
    }, [isAuthenticated])

    const saveQuickActions = async (actions: SidebarActionId[]) => {
        const { data } = await authApi.saveSidebarActions(actions)
        setQuickActions(data.actions)
    }

    return (
        <>
            <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
                {/* Верхняя часть - логотип и кнопка скрытия */}
                <div className="sidebar__header">
                    <Link to="/" icon={logoIcon} className="sidebar__logo" title="Вернуться на главную">
                    </Link>
                    <Button
                        variant="ghost"
                        size="md"
                        icon={!isCollapsed ? sidebarCloseIcon : sidebarOpenIcon}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="sidebar__toggle"
                        title={isCollapsed ? 'Показать боковое меню' : 'Скрыть боковое меню'}
                    />
                </div>

                <div className="sidebar__divider"></div>

                {/* Основная навигация */}
                <nav className="sidebar__nav">
                    <Link
                        to="/notifications"
                        size='md'
                        icon={notificationOnIcon}
                        className="sidebar__nav-item"
                        title="Просмотреть уведомления"
                        badge={unreadCount}
                    >
                        {!isCollapsed && <span className="sidebar__nav-text">Уведомления</span>}
                    </Link>

                    <Link to="/calendar" size='md' icon={calendarIcon} className="sidebar__nav-item" title="Открыть календарь">
                        {!isCollapsed && <span className="sidebar__nav-text">Календарь</span>}
                    </Link>

                    <Button
                        variant="ghost"
                        size="md"
                        icon={addIcon}
                        onClick={() => isAuthenticated ? setShowAddAction(true) : navigate('/auth/login')}
                        className="sidebar__add-btn"
                        title="Добавить действие"
                    >
                        {!isCollapsed && 'Добавить действие'}
                    </Button>

                    <SidebarQuickActions actions={quickActions} isCollapsed={isCollapsed} />
                </nav>

                <div className="sidebar__divider"></div>

                {/* Нижняя часть - ссылки и настройки */}
                <div className="sidebar__footer">
                    <a
                        href="https://github.com/Kirill-Alexeev/KirllAlexv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar__external-link"
                        title="Открыть репозиторий сайта на GitHub"
                    >
                        <img src={gitHubIcon} alt="GitHub" className="sidebar__nav-icon" />
                        {!isCollapsed && <span className="sidebar__nav-text">GitHub</span>}
                    </a>

                    <Button
                        variant="ghost"
                        size="md"
                        icon={settingsIcon}
                        onClick={() => setShowAppSettings(true)}
                        className="sidebar__settings-btn"
                        title="Открыть настройки"
                    >
                        {!isCollapsed && 'Настройки'}
                    </Button>
                </div>

                <div className="sidebar__divider"></div>

                {/* Блок пользователя */}
                <div className="sidebar__user">
                    {isAuthenticated ? (
                        <>
                            <Link to='/profile' className="sidebar__user-info" title="Открыть профиль">
                                <div className="sidebar__user-avatar">
                                    {user?.photo ? (
                                        <img src={user.photo} alt={user.username} />
                                    ) : (
                                        <span className="sidebar__user-initials">
                                            {user?.first_name && user?.last_name ? user?.first_name[0] + '' + user?.last_name[0] : user?.username[0]}
                                        </span>
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <div className="sidebar__user-details">
                                        <span className="sidebar__user-name">
                                            {user?.first_name && user?.last_name ? user.first_name + ' ' + user.last_name : user?.username}
                                        </span>
                                    </div>
                                )}
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={profileSettingsIcon}
                                onClick={() => setShowProfileSettings(true)}
                                className="sidebar__profile-settings"
                                title="Настройки профиля"
                            >
                            </Button>
                        </>
                    ) : (
                        <div className="sidebar__auth-buttons">
                            <Button
                                variant={!isCollapsed ? 'primary' : 'ghost'}
                                size="md"
                                icon={!isCollapsed ? '' : logInIcon}
                                onClick={() => navigate('/auth/login')}
                                className="sidebar__login-btn"
                                title="Войти в аккаунт"
                            >
                                {!isCollapsed ? 'Войти' : ''}
                            </Button>
                            {!isCollapsed && (
                                <Button
                                    variant="outline"
                                    size="md"
                                    onClick={() => navigate('/auth/register')}
                                    className="sidebar__register-btn"
                                    title="Зарегистрироваться"
                                >
                                    Регистрация
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Модальные окна */}
            <AddAction
                isOpen={showAddAction}
                onClose={() => setShowAddAction(false)}
                selected={quickActions}
                onSave={saveQuickActions}
            />

            <AppSettings
                isOpen={showAppSettings}
                onClose={() => setShowAppSettings(false)}
            />

            <ProfileSettings
                isOpen={showProfileSettings}
                onClose={() => setShowProfileSettings(false)}
            />
        </>
    )
}
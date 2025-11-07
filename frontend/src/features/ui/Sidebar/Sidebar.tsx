import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/stores'
import { Button, Link } from '@/components/ui'
import logoIcon from "../../../assets/icons/logo.svg";
import sidebarCloseIcon from "../../../assets/icons/sidebar-close.svg";
import sidebarOpenIcon from "../../../assets/icons/sidebar-open.svg";
import notificationOnIcon from "../../../assets/icons/notification-on.svg";
import calendarIcon from "../../../assets/icons/calendar.svg";
import addIcon from "../../../assets/icons/add.svg";
import settingsIcon from "../../../assets/icons/settings.svg";
import gitHubIcon from "../../../assets/icons/github.svg";
import profileSettingsIcon from "../../../assets/icons/profile-settings.svg";
import logInIcon from "../../../assets/icons/log-in.svg";
import { AddAction } from '@/components/ui/Sidebar/AddAction/AddAction'
import { AppSettings } from '@/components/ui/Sidebar/AppSettings/AppSettings'
import { ProfileSettings } from '@/components/ui/Sidebar/ProfileSettings/ProfileSettings'
import './Sidebar.scss'

export const Sidebar: React.FC = () => {
    const navigate = useNavigate()
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [showAddAction, setShowAddAction] = useState(false)
    const [showAppSettings, setShowAppSettings] = useState(false)
    const [showProfileSettings, setShowProfileSettings] = useState(false)

    return (
        <>
            <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
                {/* Верхняя часть - логотип и кнопка скрытия */}
                <div className="sidebar__header">
                    <Link to="/" icon={logoIcon} className="sidebar__logo">
                    </Link>
                    <Button
                        variant="ghost"
                        size="lg"
                        icon={!isCollapsed ? sidebarCloseIcon : sidebarOpenIcon}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="sidebar__toggle"
                    />
                </div>

                <div className="sidebar__divider"></div>

                {/* Основная навигация */}
                <nav className="sidebar__nav">
                    <Link to="/notifications" size='lg' icon={notificationOnIcon} className="sidebar__nav-item">
                        {!isCollapsed && <span className="sidebar__nav-text">Уведомления</span>}
                    </Link>

                    <Link to="/calendar" size='lg' icon={calendarIcon} className="sidebar__nav-item">
                        {!isCollapsed && <span className="sidebar__nav-text">Календарь</span>}
                    </Link>

                    <Button
                        variant="ghost"
                        size="lg"
                        icon={addIcon}
                        onClick={() => setShowAddAction(true)}
                        className="sidebar__add-btn"
                    >
                        {!isCollapsed && 'Добавить'}
                    </Button>
                </nav>

                <div className="sidebar__divider"></div>

                {/* Нижняя часть - ссылки и настройки */}
                <div className="sidebar__footer">
                    <a
                        href="https://github.com/Kirill-Alexeev/KirllAlexv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar__external-link"
                    >
                        <img src={gitHubIcon} alt="GitHub" className="sidebar__nav-icon" />
                        {!isCollapsed && <span className="sidebar__nav-text">GitHub</span>}
                    </a>

                    <Button
                        variant="ghost"
                        size="lg"
                        icon={settingsIcon}
                        onClick={() => setShowAppSettings(true)}
                        className="sidebar__settings-btn"
                    >
                        {!isCollapsed && 'Настройки'}
                    </Button>
                </div>

                <div className="sidebar__divider"></div>

                {/* Блок пользователя */}
                <div className="sidebar__user">
                    {isAuthenticated ? (
                        <>
                            <Link to='/profile' className="sidebar__user-info">
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
                            >
                            </Button>
                        </>
                    ) : (
                        <div className="sidebar__auth-buttons">
                            <Button
                                variant={!isCollapsed ? 'primary' : 'ghost'}
                                size="lg"
                                icon={!isCollapsed ? '' : logInIcon}
                                onClick={() => navigate('/auth/login')}
                                className="sidebar__login-btn"
                            >
                                {!isCollapsed ? 'Войти' : ''}
                            </Button>
                            {!isCollapsed && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => navigate('/auth/register')}
                                    className="sidebar__register-btn"
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
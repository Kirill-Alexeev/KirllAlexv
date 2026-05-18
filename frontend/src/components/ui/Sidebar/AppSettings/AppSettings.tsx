import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import darkThemeIcon from "../../../../assets/icons/dark-theme.svg"
import lightThemeIcon from "../../../../assets/icons/light-theme.svg"
import './AppSettings.scss'

interface AppSettingsProps {
    isOpen: boolean
    onClose: () => void
}

export const AppSettings: React.FC<AppSettingsProps> = ({ isOpen, onClose }) => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    const [language, setLanguage] = useState<'ru' | 'en'>('ru')
    const [notifications, setNotifications] = useState(true)

    const handleSave = () => {
        console.log('Settings saved:', { theme, language, notifications })
        // Здесь будет логика сохранения настроек
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Настройки приложения"
            size="md"
        >
            <div className="app-settings">
                <div className="app-settings__section">
                    <h3 className="app-settings__section-title">Тема</h3>
                    <div className="app-settings__options">
                        {[
                            { value: 'dark', label: 'Тёмная', icon: darkThemeIcon },
                            { value: 'light', label: 'Светлая', icon: lightThemeIcon },
                        ].map(option => (
                            <div
                                key={option.value}
                                className={`app-settings__option ${theme === option.value ? 'app-settings__option--selected' : ''
                                    }`}
                                onClick={() => setTheme(option.value as any)}
                            >
                                <img className="app-settings__option-icon" src={option.icon} alt={option.label} />
                                <span className="app-settings__option-label">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="app-settings__section">
                    <h3 className="app-settings__section-title">Язык</h3>
                    <div className="app-settings__options">
                        {[
                            { value: 'ru', label: 'Русский', flag: '🇷🇺' },
                            { value: 'en', label: 'English', flag: '🇺🇸' }
                        ].map(option => (
                            <div
                                key={option.value}
                                className={`app-settings__option ${language === option.value ? 'app-settings__option--selected' : ''
                                    }`}
                                onClick={() => setLanguage(option.value as any)}
                            >
                                <span className="app-settings__option-icon">{option.flag}</span>
                                <span className="app-settings__option-label">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="app-settings__section">
                    <h3 className="app-settings__section-title">Дополнительно</h3>
                    <div className="app-settings__additional">
                        <div className="app-settings__additional-item">
                            <span className="app-settings__additional-label">Уведомления</span>
                            <label className="app-settings__toggle">
                                <input
                                    type="checkbox"
                                    checked={notifications}
                                    onChange={(e) => setNotifications(e.target.checked)}
                                />
                                <span className="app-settings__toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="app-settings__footer">
                    <Button variant="outline" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
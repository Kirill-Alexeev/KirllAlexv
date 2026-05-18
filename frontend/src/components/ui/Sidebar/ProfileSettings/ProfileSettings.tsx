import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal/Modal'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import { logout } from '@/stores/auth/authSlice'
import { deleteAccount } from '@/stores/auth/authActions'
import { RootState } from '@/stores'
import trashIcon from "../../../../assets/icons/trash.svg";
import logoutIcon from "../../../../assets/icons/log-out.svg";
import './ProfileSettings.scss'

interface ProfileSettingsProps {
    isOpen: boolean
    onClose: () => void
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
    isOpen,
    onClose
}) => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { isLoading } = useSelector((state: RootState) => state.auth)

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setDeleteError(null)
        }
    }, [isOpen])

    const handleLogout = () => {
        dispatch(logout())
        navigate('/')
        setShowLogoutConfirm(false)
        onClose()
    }

    const handleDeleteAccount = async () => {
        setDeleteError(null)
        try {
            // @ts-ignore - TypeScript временно
            dispatch(deleteAccount())
            navigate('/')
            setShowDeleteConfirm(false)
            onClose()
        } catch (err: any) {
            console.error('Failed to delete account:', err)
            setDeleteError(err?.message || 'Не удалось удалить аккаунт. Попробуйте позже.')
        }
    }

    const handleCloseDeleteConfirm = () => {
        setShowDeleteConfirm(false)
        setDeleteError(null)
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Настройки профиля"
                size="sm"
            >
                <div className="profile-settings">
                    {deleteError && (
                        <div className="profile-settings__error">
                            {deleteError}
                        </div>
                    )}

                    <div className="profile-settings__section">
                        <div className="profile-settings__actions">
                            <button
                                className="profile-settings__action profile-settings__action--logout"
                                onClick={() => setShowLogoutConfirm(true)}
                                disabled={isLoading}
                            >
                                <img className="profile-settings__action-icon" src={logoutIcon} alt="Выход из аккаунта" />
                                <span className="profile-settings__action-text">Выйти из аккаунта</span>
                            </button>

                            <button
                                className="profile-settings__action profile-settings__action--delete"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isLoading}
                            >
                                <img className="profile-settings__action-icon" src={trashIcon} alt="Удалить аккаунт" />
                                <span className="profile-settings__action-text">
                                    Удалить аккаунт
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Модалка подтверждения выхода */}
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Выход из аккаунта"
                description="Вы уверены, что хотите выйти из аккаунта?"
                confirmText="Выйти"
            />

            {/* Модалка подтверждения удаления */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={handleCloseDeleteConfirm}
                onConfirm={handleDeleteAccount}
                title="Удаление аккаунта"
                description="Это действие невозможно отменить! Все ваши данные будут удалены навсегда."
                confirmText={isLoading ? "Удаление..." : "Удалить"}
                variant="danger"
                isLoading={isLoading}
            />
        </>
    )
}
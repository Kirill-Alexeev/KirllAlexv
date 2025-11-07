import React from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'
import './ConfirmationModal.scss'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText: string
    variant?: 'danger' | 'primary'
    isLoading?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    variant = 'primary',
    isLoading = false
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="confirmation-modal">
                <h3 className="confirmation-modal__title">{title}</h3>
                <p className="confirmation-modal__description">{description}</p>
                <div className="confirmation-modal__footer">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
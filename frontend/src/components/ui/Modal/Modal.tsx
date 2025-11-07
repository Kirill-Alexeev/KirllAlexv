import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../Button/Button'
import './Modal.scss'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
    showCloseButton?: boolean
    className?: string
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    className = ''
}) => {
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    useEffect(() => {
        if (isOpen && modalRef.current) {
            modalRef.current.focus()
        }
    }, [isOpen])

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return createPortal(
        <div
            className={`modal-backdrop ${className}`}
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className={`modal modal--${size}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "modal-title" : undefined}
                tabIndex={-1}
            >
                {(title || showCloseButton) && (
                    <div className="modal__header">
                        {title && (
                            <h2 id="modal-title" className="modal__title">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon="✕"
                                onClick={onClose}
                                className="modal__close-btn"
                                aria-label="Закрыть модальное окно"
                            />
                        )}
                    </div>
                )}
                <div className="modal__content">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
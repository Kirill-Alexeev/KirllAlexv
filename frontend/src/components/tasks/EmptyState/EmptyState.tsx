import React from 'react'
import { Button } from '@/components/ui'
import addIcon from '@/assets/icons/add.svg'
import './EmptyState.scss'

interface EmptyStateProps {
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
    secondaryActionLabel?: string
    onSecondaryAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
}) => {
    return (
        <div className="empty-state">
            <h3 className="empty-state__title">{title}</h3>
            {description && <p className="empty-state__description">{description}</p>}
            {((actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction)) && (
                <div className="empty-state__actions">
                    {actionLabel && onAction && (
                        <Button variant="primary" icon={addIcon} onClick={onAction}>
                            {actionLabel}
                        </Button>
                    )}
                    {secondaryActionLabel && onSecondaryAction && (
                        <Button variant="outline" onClick={onSecondaryAction}>
                            {secondaryActionLabel}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

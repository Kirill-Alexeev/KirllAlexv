import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ButtonSize } from '@/types'
import './Link.scss'

interface LinkProps {
    to: string
    size?: ButtonSize
    icon?: string
    children?: React.ReactNode
    className?: string
    variant?: 'default' | 'primary' | 'secondary'
    title?: string
    /** Счётчик на иконке; при 0 не показывается */
    badge?: number
}

export const Link: React.FC<LinkProps> = ({
    to,
    size = 'md',
    icon,
    children,
    className = '',
    variant = 'default',
    title,
    badge,
}) => {
    const baseClass = 'custom-link'
    const sizeClass = `custom-link--${size}`
    const variantClass = `custom-link--${variant}`

    const classes = [
        baseClass,
        sizeClass,
        variantClass,
        className
    ].filter(Boolean).join(' ')

    const iconImage = icon && <img className="custom-link__icon" src={icon} alt="decorate"></img>

    return (
        <RouterLink to={to} className={classes} title={title}>
            {badge === undefined ? iconImage : (
                <span className="custom-link__icon-wrap">
                    {iconImage}
                    {badge > 0 && <span className="custom-link__badge">{badge}</span>}
                </span>
            )}
            {children && <span className="custom-link__text">{children}</span>}
        </RouterLink>
    )
}
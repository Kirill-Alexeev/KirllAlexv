import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ButtonSize } from '@/types'
import './Link.scss'

interface LinkProps {
    to: string
    size?: ButtonSize
    icon?: React.ReactNode
    children?: React.ReactNode
    className?: string
    variant?: 'default' | 'primary' | 'secondary'
}

export const Link: React.FC<LinkProps> = ({
    to,
    size = 'md',
    icon,
    children,
    className = '',
    variant = 'default'
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

    return (
        <RouterLink to={to} className={classes}>
            {icon && <span className="custom-link__icon">{icon}</span>}
            {children && <span className="custom-link__text">{children}</span>}
        </RouterLink>
    )
}
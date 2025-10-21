import React from 'react'
import { ButtonSize, ButtonVariant } from '@/types'
import './Button.scss'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: ButtonSize
    variant?: ButtonVariant
    icon?: string
    children?: React.ReactNode
    loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
    size = 'md',
    variant = 'primary',
    icon,
    children,
    loading = false,
    disabled = false,
    className = '',
    ...props
}) => {
    const baseClass = 'btn'
    const sizeClass = `btn--${size}`
    const variantClass = `btn--${variant}`
    const loadingClass = loading ? 'btn--loading' : ''
    const disabledClass = disabled ? 'btn--disabled' : ''

    const classes = [
        baseClass,
        sizeClass,
        variantClass,
        loadingClass,
        disabledClass,
        className
    ].filter(Boolean).join(' ')

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <div className="btn__spinner" />}
            {icon && !loading && <img className="btn__icon" src={icon} alt="Decorate"></img>}
            {children && <span className="btn__text">{children}</span>}
        </button>
    )
}
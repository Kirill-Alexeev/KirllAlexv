import React from 'react'
import type { User } from '@/types'
import './Avatar.scss'

type AvatarUser = Pick<User, 'username' | 'first_name' | 'last_name'> & {
    photo?: string | null
    photo_url?: string | null
}

interface AvatarProps {
    user: AvatarUser
    size?: 'xs' | 'sm' | 'md' | 'xl'
    className?: string
    title?: string
}

export const getUserInitials = (user: AvatarUser): string => {
    if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()
}

/** Фото пользователя или инициалы в кружке — как в сайдбаре */
export const Avatar: React.FC<AvatarProps> = ({ user, size = 'sm', className = '', title }) => {
    const photo = user.photo_url || user.photo

    return (
        <span className={`avatar avatar--${size} ${className}`} title={title} aria-hidden={!title}>
            {photo ? (
                <img src={photo} alt="" />
            ) : (
                <span className="avatar__initials">{getUserInitials(user)}</span>
            )}
        </span>
    )
}

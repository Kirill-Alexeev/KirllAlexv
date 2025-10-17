export const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU')
}

export const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ru-RU')
}

export const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

export const classNames = (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ')
}
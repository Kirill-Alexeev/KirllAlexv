/** DRF PageNumberPagination: { count, next, previous, results } или обычный массив */
export const unwrapList = <T>(data: unknown): T[] => {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
        return (data as { results: T[] }).results
    }
    return []
}

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

/** Ошибки полей формы из ответа API: { поле: первое сообщение } */
export const parseFieldErrors = (error: any): Record<string, string> => {
    const data = error.response?.data
    if (!data || typeof data !== 'object') return {}
    return Object.fromEntries(
        Object.entries(data)
            .filter(([, messages]) => Array.isArray(messages))
            .map(([field, messages]) => [field, String((messages as unknown[])[0])])
    )
}

export const parseApiError = (error: any): string => {
    const data = error.response?.data

    if (!data) return 'Ошибка сети'

    if (typeof data.detail === 'string') return data.detail

    if (typeof data === 'object') {
        const messages = Object.entries(data)
            .map(([field, errors]) => {
                const fieldName = field === 'non_field_errors' ? '' : `${field}: `
                const errorList = Array.isArray(errors)
                    ? errors.join(', ')
                    : String(errors)
                return `${fieldName}${errorList}`
            })
        return messages.join('\n')
    }

    return 'Неизвестная ошибка'
}
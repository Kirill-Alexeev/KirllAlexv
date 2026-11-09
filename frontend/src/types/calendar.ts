/** Событие на конкретную дату: ежегодные развёрнуты по годам */
export interface CalendarOccurrence {
    /** У системных праздников — строка, у личных событий — id записи */
    id: number | string
    title: string
    description: string
    date: string
    /** Дата, с которой событие было создано (для редактирования ежегодных) */
    source_date: string
    is_yearly: boolean
    is_system: boolean
}

export interface CalendarEventData {
    title: string
    description: string
    date: string
    is_yearly: boolean
}

export interface CalendarRange {
    from: string
    to: string
}

export interface CalendarState {
    events: CalendarOccurrence[]
    /** Какой диапазон открыт на странице календаря (null — страница закрыта) */
    range: CalendarRange | null
    isLoading: boolean
    error: string | null
}

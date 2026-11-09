export interface NotificationPreferences {
    enabled: boolean
    apps: {
        tasks: { enabled: boolean; overdue: boolean; today: boolean }
        calendar: { enabled: boolean; today: boolean; tomorrow: boolean; holidays: boolean }
    }
}

export interface AppNotification {
    key: string
    app: string
    type: string
    title: string
    message: string
    link: string
    action_label: string
    is_read: boolean
}

export interface NotificationsState {
    items: AppNotification[]
}

export type SidebarActionId = 'task' | 'workspace_task' | 'event'

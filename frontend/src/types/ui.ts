export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'file' | 'select' | 'textarea'

export interface BaseComponentProps {
    className?: string
    disabled?: boolean
}

export interface InputOption {
    value: string
    label: string
}
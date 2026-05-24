import React from 'react'
import { InputSize, InputType, InputOption } from '@/types'
import './Input.scss'

type CommonProps = {
  inputSize?: InputSize
  type?: InputType
  label?: string
  error?: string
  helperText?: string
  options?: InputOption[]
  className?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
}

type InputOnlyProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
>

type SelectOnlyProps = React.SelectHTMLAttributes<HTMLSelectElement>

type TextareaOnlyProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

type InputProps = CommonProps & {
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  autoComplete?: string
  required?: boolean
  readOnly?: boolean
  maxLength?: number
  minLength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  pattern?: string
  multiple?: boolean
  accept?: string
  rows?: number
  cols?: number
}

export const Input: React.FC<InputProps> = ({
  inputSize = 'md',
  type = 'text',
  label,
  error,
  helperText,
  options,
  className = '',
  onChange,
  ...props
}) => {
  const classes = [
    'input-wrapper',
    `input-wrapper--${inputSize}`,
    error ? 'input-wrapper--error' : '',
    className
  ].filter(Boolean).join(' ')

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            className="input"
            onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
            {...(props as SelectOnlyProps)}
          >
            <option value="">{props.placeholder || 'Выберите опцию'}</option>
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            className="input input--textarea"
            onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
            {...(props as TextareaOnlyProps)}
          />
        )

      default:
        return (
          <input
            type={type}
            className="input"
            onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
            {...(props as InputOnlyProps)}
          />
        )
    }
  }

  return (
    <div className={classes}>
      {label && <label className="input__label">{label}</label>}
      {renderInput()}
      {error && <span className="input__error">{error}</span>}
      {helperText && !error && <span className="input__helper">{helperText}</span>}
    </div>
  )
}
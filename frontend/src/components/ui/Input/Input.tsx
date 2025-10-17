import React from 'react'
import { InputSize, InputType, InputOption } from '@/types'
import './Input.scss'

interface InputProps {
  inputSize?: InputSize
  type?: InputType
  label?: string
  error?: string
  helperText?: string
  options?: InputOption[]
  className?: string
  [key: string]: any // Позволяет передавать любые другие пропсы
}

export const Input: React.FC<InputProps> = ({
  inputSize = 'md',
  type = 'text',
  label,
  error,
  helperText,
  options,
  className = '',
  ...props
}) => {
  const baseClass = 'input-wrapper'
  const sizeClass = `input-wrapper--${inputSize}`
  const errorClass = error ? 'input-wrapper--error' : ''

  const classes = [
    baseClass,
    sizeClass,
    errorClass,
    className
  ].filter(Boolean).join(' ')

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            className="input"
            {...props}
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
            {...props}
          />
        )

      default:
        return (
          <input
            type={type}
            className="input"
            {...props}
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
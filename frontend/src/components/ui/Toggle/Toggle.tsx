import React from 'react'
import './Toggle.scss'

interface ToggleProps {
    label: string
    checked: boolean
    disabled?: boolean
    strong?: boolean
    onChange: (checked: boolean) => void
}

export const Toggle: React.FC<ToggleProps> = ({
    label,
    checked,
    disabled = false,
    strong = false,
    onChange,
}) => (
    <label className={`toggle ${disabled ? 'toggle--disabled' : ''} ${strong ? 'toggle--strong' : ''}`}>
        <span className="toggle__label">{label}</span>
        <input
            type="checkbox"
            role="switch"
            className="toggle__input"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle__track" aria-hidden="true" />
    </label>
)

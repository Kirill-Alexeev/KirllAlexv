import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import moreIcon from '@/assets/icons/more.svg'
import './DropdownMenu.scss'

export interface DropdownMenuItem {
    label: string
    onClick: () => void
    danger?: boolean
    disabled?: boolean
}

interface DropdownMenuProps {
    items: DropdownMenuItem[]
    label?: string
    disabled?: boolean
}

const MENU_WIDTH = 220

/** Кнопка «⋮» с выпадающим меню (как «Ещё» в хедере). Меню рендерится в body,
 *  поэтому не обрезается прокруткой модалки */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
    items,
    label = 'Действия',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    const close = useCallback(() => setIsOpen(false), [])

    const updatePosition = useCallback(() => {
        const button = buttonRef.current
        if (!button) return
        const rect = button.getBoundingClientRect()
        const menuHeight = menuRef.current?.offsetHeight ?? 0
        const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
        const fitsBelow = rect.bottom + 6 + menuHeight <= window.innerHeight - 8
        const top = fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - 6 - menuHeight)
        setPosition({ top, left })
    }, [])

    useLayoutEffect(() => {
        if (isOpen) updatePosition()
    }, [isOpen, updatePosition])

    useEffect(() => {
        if (!isOpen) return
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node
            if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
            close()
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation()
                close()
            }
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKey, true)
        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKey, true)
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
        }
    }, [isOpen, close])

    if (!items.length) return null

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`dropdown-menu__trigger ${isOpen ? 'dropdown-menu__trigger--open' : ''}`}
                onClick={() => setIsOpen(v => !v)}
                disabled={disabled}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                title={label}
            >
                <img src={moreIcon} alt="" />
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="dropdown-menu"
                    role="menu"
                    style={{
                        top: position?.top ?? -9999,
                        left: position?.left ?? -9999,
                        width: MENU_WIDTH,
                    }}
                >
                    {items.map(item => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            className={`dropdown-menu__item ${item.danger ? 'dropdown-menu__item--danger' : ''}`}
                            disabled={item.disabled}
                            onClick={() => {
                                close()
                                item.onClick()
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </>
    )
}

import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import arrowDownIcon from "../../../assets/icons/arrow-without-down.svg";
import arrowUpIcon from "../../../assets/icons/arrow-without-up.svg";
import './Header.scss'

interface AppLink {
    name: string
    path: string
    available: boolean
}

const mainApps: AppLink[] = [
    { name: 'Планировщик задач', path: '/tasks', available: true },
    { name: 'Заметки', path: '/notes', available: false },
    { name: 'Тренировки', path: '/workouts', available: false },
    { name: 'Библиотека', path: '/library', available: false },
    { name: 'Трекер бюджета', path: '/budget', available: false },
]

const moreApps: AppLink[] = [
    { name: 'Игры', path: '/games', available: false },
    { name: 'Блог', path: '/blog', available: false },
]

export const Header: React.FC = () => {
    const [isMoreOpen, setIsMoreOpen] = useState(false)
    const moreRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
                setIsMoreOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const renderAppLink = (app: AppLink) => (
        <Link
            key={app.name}
            to={app.available ? app.path : '#'}
            className={`header__app-link ${!app.available ? 'header__app-link--disabled' : ''}`}
            onClick={() => !app.available && event?.preventDefault()}
        >
            {app.name}
        </Link>
    )

    return (
        <header className="header">
            <div className="container">
                <nav className="header__nav">
                    {mainApps.map(renderAppLink)}

                    <div className="header__more" ref={moreRef}>
                        <Button
                            variant="ghost"
                            className="header__more-btn"
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            icon={isMoreOpen ? arrowUpIcon : arrowDownIcon}
                        >
                            Ещё
                        </Button>

                        {isMoreOpen && (
                            <div className="header__more-dropdown">
                                {moreApps.map(renderAppLink)}
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    )
}
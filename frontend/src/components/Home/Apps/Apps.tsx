import React from 'react'
import { Link } from 'react-router-dom'
import './Apps.scss'
import placeholderImg from '../../../assets/img/placeholder.png'

interface App {
    id: string
    name: string
    description: string
    path: string
    available: boolean
    screenshot: string
}

const apps: App[] = [
    {
        id: 'tasks',
        name: 'Планировщик задач',
        description: 'Организуйте задачи, устанавливайте сроки и приоритеты',
        path: '/tasks',
        available: true,
        screenshot: ''
    },
    {
        id: 'notes',
        name: 'Заметки',
        description: 'Создавайте и организуйте заметки в удобном формате',
        path: '/notes',
        available: false,
        screenshot: ''
    },
    {
        id: 'workouts',
        name: 'Тренировки',
        description: 'Создавайте планы тренировок и отслеживайте прогресс',
        path: '/workouts',
        available: false,
        screenshot: ''
    },
    {
        id: 'library',
        name: 'Библиотека',
        description: 'Каталогизируйте книги и отслеживайте прогресс чтения',
        path: '/library',
        available: false,
        screenshot: ''
    },
    {
        id: 'budget',
        name: 'Трекер бюджета',
        description: 'Контролируйте финансы и планируйте бюджет',
        path: '/budget',
        available: false,
        screenshot: ''
    },
    {
        id: 'calendar',
        name: 'Календарь',
        description: 'Планируйте события и встречи в удобном календаре',
        path: '/calendar',
        available: false,
        screenshot: ''
    }
]

export const Apps: React.FC = () => {
    return (
        <section className="apps">
            <div className="container">
                <h2 className="apps__title">Все приложения</h2>

                <div className="apps__grid">
                    {apps.map((app) => (
                        <Link
                            key={app.id}
                            to={app.available ? app.path : '#'}
                            className={`apps__card ${!app.available ? 'apps__card--disabled' : ''}`}
                            onClick={(e) => !app.available && e.preventDefault()}
                        >
                            <div className="apps__card-header">
                                <div className="apps__screenshot">
                                    <img className="apps__screenshot-placeholder" src={app.screenshot ? app.screenshot : placeholderImg} alt={app.name} />
                                </div>
                                {app.available ? '' :
                                    <div className="apps__status">Скоро</div>
                                }
                            </div>

                            <div className="apps__card-content">
                                <h3 className="apps__card-title">{app.name}</h3>
                                <p className="apps__card-description">{app.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
import React from 'react'
import logoIcon from '../../../assets/icons/logo.svg'
import './About.scss'

export const About: React.FC = () => {
    return (
        <section className="about">
            <div className="container">
                <div className="about__content">
                    <h1 className="about__title"></h1>
                    <img className="about__icon" src={logoIcon} alt="Логотип Core Space" />
                    <p className="about__description">
                        Ваше универсальное пространство для продуктивности и организации жизни.
                        Объединяем все необходимые инструменты в одном современном интерфейсе
                        с мощными возможностями.
                    </p>
                    <div className="about__features">
                        <div className="about__feature">
                            <span className="about__feature-icon">⚡</span>
                            <span>Быстрый и отзывчивый</span>
                        </div>
                        <div className="about__feature">
                            <span className="about__feature-icon">🔒</span>
                            <span>Безопасность данных</span>
                        </div>
                        <div className="about__feature">
                            <span className="about__feature-icon">🎨</span>
                            <span>Современный дизайн</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
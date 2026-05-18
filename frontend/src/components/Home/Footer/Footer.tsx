import React from 'react'
import './Footer.scss'

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__content">
                    <div className="footer__copyright">
                        © {currentYear} Core Space. Все права защищены.
                    </div>
                    <div className="footer__developer">
                        Разработано с ❤️
                    </div>
                </div>
            </div>
        </footer>
    )
}
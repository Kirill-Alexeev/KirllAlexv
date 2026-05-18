import React from 'react'
import './Developer.scss'
import phoneIcon from "../../../assets/icons/phone.svg";
import mailIcon from "../../../assets/icons/mail.svg";
import vkIcon from "../../../assets/icons/vk-icon.svg";
import telegramIcon from "../../../assets/icons/telegram-icon.svg";
import githubIcon from "../../../assets/icons/github-icon.svg";
import developerPhoto from "../../../assets/img/developer.jpg";

const contacts = [
    { name: 'Телефон', icon: phoneIcon, value: '+7 (951) 472-60-87', href: 'tel:89514726087' },
    { name: 'Email', icon: mailIcon, value: 'kirushkalexeev@gmail.com', href: 'mailto:kirushkalexeev@gmail.com' },
    { name: 'VK', icon: vkIcon, value: 'vk.com/kirushenk', href: 'https://vk.com/kirushenk' },
    { name: 'Telegram', icon: telegramIcon, value: 't.me/@kirilalexeev', href: 'https://t.me/kirilalexeev' },
    { name: 'GitHub', icon: githubIcon, value: 'github.com/Kirill-Alexeev', href: 'https://github.com/Kirill-Alexeev' },
]

export const Developer: React.FC = () => {
    return (
        <section className="developer">
            <div className="container">
                <div className="developer__content">
                    <div className="developer__info">
                        <h2 className="developer__title">Разработчик</h2>
                        <p className="developer__description">
                            Привет! Я - Алексеев Кирилл, создатель Core Space - современного веб-приложения
                            для организации жизни. Увлекаюсь разработкой удобных и
                            функциональных интерфейсов.
                        </p>
                        <div className="developer__section">
                            <h3 className="developer__contact-title">Контакты</h3>
                            <div className="developer__contacts">
                                {contacts.map((contact) => (
                                    <a
                                        key={contact.name}
                                        href={contact.href}
                                        className="developer__contact"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img className="developer__contact-icon" src={contact.icon} alt={contact.name} />
                                        <span className="developer__contact-text">{contact.value}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="developer__photo">
                        <img className="developer__photo-img" src={developerPhoto} alt="Алексеев Кирилл - разработчик CoreSpace" />
                    </div>
                </div>
            </div>
        </section>
    )
}
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import checkboxIcon from "../../../../assets/icons/check-mark.svg";
import './AddAction.scss'

interface AddActionProps {
    isOpen: boolean
    onClose: () => void
}

const availableActions = [
    { id: 'task', label: 'Задача', icon: '', enabled: true },
    { id: 'event', label: 'Событие', icon: '', enabled: true },
    { id: 'note', label: 'Заметка', icon: '', enabled: false },
    { id: 'book', label: 'Книга', icon: '', enabled: false },
    { id: 'workout', label: 'Тренировка', icon: '', enabled: false },
    { id: 'expense', label: 'Расход', icon: '', enabled: false },
]

export const AddAction: React.FC<AddActionProps> = ({ isOpen, onClose }) => {
    const handleSave = () => {
        console.log('Selected actions:')
        // Здесь будет логика сохранения выбранных действий
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Доступные действия"
            size="md"
        >
            <div className="add-action">
                <p className="add-action__description">
                    Выберите действия, которые будут отображаться в сайдбаре
                </p>

                <div className="add-action__list">
                    {availableActions.map(action => (
                        <div
                            key={action.id}
                            className={`add-action__item ${!action.enabled ? 'add-action__item--disabled' : ''}`}
                        >
                            <div className="add-action__checkbox">
                                <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={() => { }}
                                    disabled={!action.enabled}
                                    className="add-action__checkbox-input"
                                />
                                <img className="add-action__checkbox-custom" src={checkboxIcon} alt="" />
                            </div>

                            <span className="add-action__icon">{action.icon}</span>

                            <div className="add-action__content">
                                <span className="add-action__label">{action.label}</span>
                                {!action.enabled && (
                                    <span className="add-action__badge">Скоро</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="add-action__footer">
                    <Button variant="outline" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
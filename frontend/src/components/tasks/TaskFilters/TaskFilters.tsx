import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/stores'
import { setFilters, resetFilters } from '@/stores/tasks/tasksSlice'
import { deleteTag } from '@/stores/tasks/tasksActions'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import type { Tag } from '@/types'
import closeIcon from '@/assets/icons/close.svg'
import { PRIORITY_LABELS } from '@/utils/tasksUtils'
import filterIcon from '@/assets/icons/filter.svg'
import searchIcon from '@/assets/icons/search.svg'
import './TaskFilters.scss'

export const TaskFilters: React.FC = () => {
    const dispatch = useDispatch()
    const { filters, tags: tagsState } = useSelector((state: RootState) => state.tasks)
    const tags = Array.isArray(tagsState) ? tagsState : []
    const [isOpen, setIsOpen] = useState(false)
    const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
    const [isDeletingTag, setIsDeletingTag] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const confirmDeleteTag = async () => {
        if (!tagToDelete) return
        setIsDeletingTag(true)
        try {
            await dispatch(deleteTag(tagToDelete.id) as any)
            setTagToDelete(null)
        } catch {
            // ошибка уже записана в стор
        } finally {
            setIsDeletingTag(false)
        }
    }

    const hasActiveFilters =
        filters.priority !== null || filters.tagId !== null || filters.status !== null

    return (
        <div className="task-filters">
            <div className="task-filters__dropdown" ref={dropdownRef}>
                <button
                    type="button"
                    className={`task-filters__trigger ${hasActiveFilters ? 'task-filters__trigger--active' : ''}`}
                    onClick={() => setIsOpen(v => !v)}
                >
                    <img src={filterIcon} alt="" />
                    <span>Фильтры</span>
                </button>

                {isOpen && (
                    <div className="task-filters__panel">
                        <label className="task-filters__field">
                            <span>Приоритет</span>
                            <select
                                value={filters.priority ?? ''}
                                onChange={(e) =>
                                    dispatch(setFilters({
                                        priority: e.target.value ? Number(e.target.value) : null,
                                    }))
                                }
                            >
                                <option value="">Все</option>
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>

                        <label className="task-filters__field">
                            <span>Тег</span>
                            <select
                                value={filters.tagId ?? ''}
                                onChange={(e) =>
                                    dispatch(setFilters({
                                        tagId: e.target.value ? Number(e.target.value) : null,
                                    }))
                                }
                            >
                                <option value="">Все</option>
                                {tags.map(tag => (
                                    <option key={tag.id} value={tag.id}># {tag.title}</option>
                                ))}
                            </select>
                        </label>

                        <label className="task-filters__field">
                            <span>Статус</span>
                            <select
                                value={filters.status ?? ''}
                                onChange={(e) =>
                                    dispatch(setFilters({
                                        status: e.target.value ? Number(e.target.value) : null,
                                    }))
                                }
                            >
                                <option value="">Все</option>
                                <option value="1">Активна</option>
                                <option value="2">Завершена</option>
                                <option value="3">Просрочена</option>
                            </select>
                        </label>

                        {tags.length > 0 && (
                            <div className="task-filters__tags">
                                <span className="task-filters__tags-title">Мои теги</span>
                                <ul className="task-filters__tags-list">
                                    {tags.map(tag => (
                                        <li key={tag.id} className="task-filters__tag">
                                            <span className="task-filters__tag-name">
                                                #{tag.title}
                                            </span>
                                            <button
                                                type="button"
                                                className="task-filters__tag-delete"
                                                onClick={() => setTagToDelete(tag)}
                                                aria-label={`Удалить тег ${tag.title}`}
                                                title="Удалить тег"
                                            >
                                                <img src={closeIcon} alt="" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="task-filters__reset"
                                onClick={() => dispatch(resetFilters())}
                            >
                                Сбросить
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="task-filters__search">
                <input
                    type="search"
                    placeholder="Поиск"
                    value={filters.search}
                    onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
                    aria-label="Поиск задач"
                />
                <img src={searchIcon} alt="" className="task-filters__search-icon" />
            </div>

            <ConfirmationModal
                isOpen={tagToDelete !== null}
                onClose={() => setTagToDelete(null)}
                onConfirm={confirmDeleteTag}
                title="Удалить тег?"
                description={`Тег «#${tagToDelete?.title ?? ''}» будет удалён и снят со всех задач.`}
                confirmText="Удалить"
                variant="danger"
                isLoading={isDeletingTag}
            />
        </div>
    )
}

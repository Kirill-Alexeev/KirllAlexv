import React, { useState } from 'react'
import type { Task } from '@/types'
import { TaskCard } from '@/components/tasks/TaskCard/TaskCard'
import { EmptyState } from '@/components/tasks/EmptyState/EmptyState'
import { Button } from '@/components/ui'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal/ConfirmationModal'
import { TASK_STATUS } from '@/utils/tasksUtils'
import './CompletedView.scss'

interface CompletedViewProps {
    tasks: Task[]
    canManage?: (task: Task) => boolean
    onToggleStatus: (task: Task) => void
    onTaskClick: (task: Task) => void
    onDeleteMany: (ids: number[]) => Promise<void>
}

export const CompletedView: React.FC<CompletedViewProps> = ({
    tasks,
    canManage,
    onToggleStatus,
    onTaskClick,
    onDeleteMany,
}) => {
    const completed = tasks.filter(t => t.status === TASK_STATUS.COMPLETED)
    const deletable = completed.filter(t => (canManage ? canManage(t) : true))
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleClear = async () => {
        setIsDeleting(true)
        try {
            await onDeleteMany(deletable.map(t => t.id))
            setConfirmOpen(false)
        } finally {
            setIsDeleting(false)
        }
    }

    if (!completed.length) {
        return (
            <EmptyState
                title="Нет выполненных задач"
                description="Завершённые задачи появятся здесь"
            />
        )
    }

    return (
        <div className="completed-view">
            <header className="completed-view__header">
                <h2 className="completed-view__title">
                    Выполнено ({completed.length})
                </h2>
                {deletable.length > 0 && (
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmOpen(true)}
                    >
                        Очистить
                    </Button>
                )}
            </header>

            <div className="completed-view__list">
                {completed.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        canComplete={canManage ? canManage(task) : true}
                        canManage={canManage ? canManage(task) : true}
                        onToggleStatus={onToggleStatus}
                        onClick={onTaskClick}
                    />
                ))}
            </div>

            <ConfirmationModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleClear}
                title="Удалить выполненные?"
                description={`Будет удалено задач: ${deletable.length}. Это действие нельзя отменить.`}
                confirmText="Удалить"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    )
}

import React, { useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import { updateUser } from '@/stores/auth/authSlice'
import { parseApiError, parseFieldErrors } from '@/utils'
import type { User } from '@/types'

const MAX_PHOTO_SIZE = 5 * 1024 * 1024

export const ProfilePhoto: React.FC<{ user: User }> = ({ user }) => {
    const dispatch = useDispatch()
    const fileInput = useRef<HTMLInputElement>(null)
    const [isBusy, setIsBusy] = useState(false)
    const [error, setError] = useState('')
    const fullName = `${user.first_name} ${user.last_name}`.trim()

    const save = async (request: ReturnType<typeof authApi.deletePhoto>) => {
        setIsBusy(true)
        setError('')
        try {
            const { data } = await request
            dispatch(updateUser(data))
        } catch (e) {
            setError(parseFieldErrors(e).photo || parseApiError(e))
        } finally {
            setIsBusy(false)
        }
    }

    const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        // Иначе повторный выбор того же файла не вызовет onChange
        event.target.value = ''
        if (!file) return
        if (file.size > MAX_PHOTO_SIZE) {
            setError('Фото должно быть не больше 5 МБ')
            return
        }
        save(authApi.uploadPhoto(file))
    }

    return (
        <section className="profile-card profile-photo">
            <Avatar user={user} size="xl" />
            <div className="profile-photo__body">
                <p className="profile-photo__name">{fullName || user.username}</p>
                <p className="profile-photo__login">@{user.username}</p>
                <div className="profile-photo__actions">
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFile}
                        hidden
                    />
                    <Button size="sm" loading={isBusy} onClick={() => fileInput.current?.click()}>
                        {user.photo_url ? 'Заменить фото' : 'Добавить фото'}
                    </Button>
                    {user.photo_url && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => save(authApi.deletePhoto())}
                        >
                            Удалить фото
                        </Button>
                    )}
                </div>
                {error && <p className="profile-page__error">{error}</p>}
            </div>
        </section>
    )
}

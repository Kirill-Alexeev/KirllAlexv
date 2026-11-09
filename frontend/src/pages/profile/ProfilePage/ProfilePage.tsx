import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/stores'
import { Header } from '@/components/Home/Header/Header'
import { ChangePasswordForm } from './ChangePasswordForm'
import { ProfileInfo } from './ProfileInfo'
import { ProfilePhoto } from './ProfilePhoto'
import { ProfileStatsSection } from './ProfileStatsSection'
import './ProfilePage.scss'

export const ProfilePage: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user)

    return (
        <div className="profile-page">
            <Header />

            {user && (
                <div className="profile-page__content">
                    <h1 className="profile-page__title">Профиль</h1>
                    <ProfilePhoto user={user} />
                    <ProfileStatsSection />
                    <ProfileInfo user={user} />
                    <ChangePasswordForm user={user} />
                </div>
            )}
        </div>
    )
}

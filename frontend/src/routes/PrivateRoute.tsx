import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/stores'

interface PrivateRouteProps {
    children: React.ReactNode
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useSelector(
        (state: RootState) => state.auth
    )
    const location = useLocation()

    if (isLoading) {
        return <div className="page-loader">Загрузка...</div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />
    }

    return <>{children}</>
}
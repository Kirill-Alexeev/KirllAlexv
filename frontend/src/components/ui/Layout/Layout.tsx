import React from 'react'
import { Sidebar } from '../../../features/ui/Sidebar/Sidebar'
import './Layout.scss'

interface LayoutProps {
    children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
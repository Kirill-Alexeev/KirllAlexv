import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
// import { useSelector } from 'react-redux'
// import { RootState } from '@/stores'
import { Home } from '@/pages/Home/Home'
import { Login } from '@/pages/auth/Login/Login'
import { Register } from '@/pages/auth/Register/Register'
// import { Tasks } from '@/pages/tasks/Tasks/Tasks'

// interface ProtectedRouteProps {
//   children: React.ReactNode
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
//   const { isAuthenticated } = useSelector((state: RootState) => state.auth)
//   return isAuthenticated ? <>{children}</> : <Navigate to="/auth/login" />
// }

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />

      {/* Защищенные маршруты */}
      {/* <Route 
        path="/tasks" 
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        } 
      /> */}

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
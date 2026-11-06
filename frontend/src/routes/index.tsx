import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { Home } from '@/pages/Home/Home'
import { Login } from '@/pages/auth/Login/Login'
import { Register } from '@/pages/auth/Register/Register'
import { TasksPage } from '@/pages/tasks/TasksPage/TasksPage'
import { WorkspacePage } from '@/pages/tasks/WorkspacePage/WorkspacePage'
import { JoinWorkspacePage } from '@/pages/tasks/JoinWorkspacePage/JoinWorkspacePage'

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />

      <Route path="/" element={
        <PrivateRoute>
          <Home />
        </PrivateRoute>
      } />

      <Route path="/tasks" element={
        <PrivateRoute>
          <TasksPage />
        </PrivateRoute>
      } />

      <Route path="/tasks/workspaces/join/:inviteCode" element={
        <PrivateRoute>
          <JoinWorkspacePage />
        </PrivateRoute>
      } />

      <Route path="/tasks/workspaces/:workspaceId" element={
        <PrivateRoute>
          <WorkspacePage />
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

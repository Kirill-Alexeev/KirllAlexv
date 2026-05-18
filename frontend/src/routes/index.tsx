import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from '@/pages/Home/Home'
import { Login } from '@/pages/auth/Login/Login'
import { Register } from '@/pages/auth/Register/Register'


export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
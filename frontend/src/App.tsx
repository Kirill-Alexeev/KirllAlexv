import React, { useEffect } from 'react'
import { Provider, useDispatch } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from '@/stores'
import { AppRoutes } from '@/routes'
import { checkAuth } from '@/stores/auth/authActions'
import './App.scss'
import { Layout } from './components/ui/Layout/Layout'

const AppContent: React.FC = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(checkAuth() as any)
  }, [dispatch])

  return (
    <div className="app">
      <Layout>
        <AppRoutes />
      </Layout>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  )
}

export default App
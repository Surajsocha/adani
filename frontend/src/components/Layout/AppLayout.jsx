import React, { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  const { isAuthenticated } = useSelector(s => s.auth)
  const [collapsed, setCollapsed] = useState(false)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="page-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

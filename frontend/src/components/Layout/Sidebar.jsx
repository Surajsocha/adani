import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FiHome, FiBook, FiUsers, FiSettings, FiChevronLeft, FiChevronRight,
  FiDroplet, FiWind, FiFileText, FiBarChart2, FiSearch, FiAlertTriangle,
  FiRepeat, FiShield
} from 'react-icons/fi'

const navItems = [
  { icon: FiHome,      label: 'Dashboard',      to: '/dashboard' },
  {
    icon: FiBook, label: 'AHP Logbook', group: true,
    children: [
      { icon: FiWind,    label: 'Dry System',     to: '/logbook/ahp/dry' },
      { icon: FiDroplet, label: 'Wet System',     to: '/logbook/ahp/wet' },
    ]
  },
  { icon: FiAlertTriangle, label: 'Event Recording', to: '/events' },
  { icon: FiRepeat,        label: 'Shift Handover',  to: '/handover' },
  { icon: FiBarChart2,     label: 'Reports',          to: '/reports' },
  { icon: FiSearch,        label: 'Search',            to: '/search' },
]

const adminNavItems = [
  { icon: FiUsers,     label: 'User Management', to: '/users' },
  { icon: FiShield,    label: 'Audit Trail',      to: '/audit' },
  { icon: FiSettings,  label: 'Settings',         to: '/settings' },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user } = useSelector(s => s.auth)
  const location = useLocation()
  const [expandedGroups, setExpandedGroups] = useState(['AHP Logbook'])

  const toggleGroup = (label) => {
    setExpandedGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">A</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <div className="brand">Adani DTPS</div>
            <div className="sub">E-Logbook System</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-label">Main Menu</div>}

        {navItems.map((item) => {
          if (item.group) {
            const isExpanded = expandedGroups.includes(item.label)
            return (
              <div key={item.label}>
                <div
                  className="nav-item"
                  onClick={() => !collapsed && toggleGroup(item.label)}
                  style={{ justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <item.icon className="nav-icon" />
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <FiChevronRight
                      size={14}
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                        transition: '0.2s',
                        opacity: 0.6,
                      }}
                    />
                  )}
                </div>
                {(isExpanded || collapsed) && item.children.map(child => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    style={collapsed ? {} : { paddingLeft: '44px' }}
                  >
                    <child.icon className="nav-icon" />
                    {!collapsed && <span className="nav-label">{child.label}</span>}
                  </NavLink>
                ))}
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon className="nav-icon" />
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          )
        })}

        {user?.role === 'superadmin' || user?.role === 'dept_admin' ? (
          <>
            {!collapsed && <div className="nav-section-label">Administration</div>}
            {adminNavItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon className="nav-icon" />
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </>
        ) : null}
      </nav>

      {/* Collapse Toggle */}
      <div className="sidebar-footer">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-end', color: 'rgba(255,255,255,0.6)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight /> : <><FiChevronLeft /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}

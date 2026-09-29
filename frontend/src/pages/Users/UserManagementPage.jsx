import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch } from 'react-icons/fi'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const ROLES = [
  { v: 'superadmin', l: 'Super Admin' },
  { v: 'dept_admin', l: 'Department Admin' },
  { v: 'supervisor', l: 'Supervisor' },
  { v: 'operator', l: 'Operator' },
  { v: 'viewer', l: 'Viewer' },
]

const ROLE_COLORS = {
  superadmin: '#EF4444',
  dept_admin: '#8B5CF6',
  supervisor: '#0D3B6E',
  operator: '#1A7F4B',
  viewer: '#6B7280',
}

export default function UserManagementPage() {
  const { user: currentUser } = useSelector(s => s.auth)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    employee_id: '', email: '', first_name: '', last_name: '',
    phone: '', role: 'operator', password: '', is_2fa_enabled: true,
  })

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users/?page_size=100')
      setUsers(res.data.results || res.data || [])
    } catch { toast.error('Failed to load users') }
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const { password, ...updateData } = formData
        await api.patch(`/users/${editingUser.id}/`, updateData)
        toast.success('User updated')
      } else {
        await api.post('/users/', formData)
        toast.success('User created')
      }
      fetchUsers()
      resetForm()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to save')
    }
  }

  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}/`, { is_active: !isActive })
      toast.success(isActive ? 'User deactivated' : 'User activated')
      fetchUsers()
    } catch { toast.error('Failed to update') }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      employee_id: user.employee_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      role: user.role,
      password: '',
      is_2fa_enabled: user.is_2fa_enabled,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({
      employee_id: '', email: '', first_name: '', last_name: '',
      phone: '', role: 'operator', password: '', is_2fa_enabled: true,
    })
  }

  const filteredUsers = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Administration › User Management</div>
          <h1 className="page-title"><FiUsers /> User Management</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true) }}>
            <FiPlus /> Add User
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <span className="card-title">{editingUser ? 'Edit User' : 'Create New User'}</span>
            <button className="btn btn-ghost btn-sm" onClick={resetForm}><FiX /></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Employee ID *</label>
                  <input type="text" className="form-control font-mono" value={formData.employee_id}
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                    disabled={!!editingUser} required />
                </div>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-control" value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input type="text" className="form-control" value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-control" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-control" value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}>
                    {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input type="password" className="form-control" value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      minLength={8} required />
                  </div>
                )}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '24px' }}>
                  <input type="checkbox" id="2fa" checked={formData.is_2fa_enabled}
                    onChange={e => setFormData({ ...formData, is_2fa_enabled: e.target.checked })} />
                  <label htmlFor="2fa" className="form-label" style={{ marginBottom: 0 }}>Enable 2FA</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FiCheck /> {editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input type="text" className="form-control" style={{ paddingLeft: 36 }} placeholder="Search users by name, ID, or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
          {loading ? (
            <div className="loading-page"><span className="spinner spinner-dark" /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>2FA</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{u.employee_id}</td>
                    <td>{u.full_name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{u.email}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        background: `${ROLE_COLORS[u.role] || '#6B7280'}12`,
                        color: ROLE_COLORS[u.role] || '#6B7280',
                      }}>
                        {ROLES.find(r => r.v === u.role)?.l || u.role}
                      </span>
                    </td>
                    <td>{u.is_2fa_enabled ? '✅' : '❌'}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(u)} title="Edit">
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          style={{ color: u.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
                        >
                          {u.is_active ? <FiX size={14} /> : <FiCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

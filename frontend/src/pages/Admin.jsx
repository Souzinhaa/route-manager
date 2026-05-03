import React, { useState, useEffect, useCallback } from 'react'
import { adminService } from '../services/api'

const PLANS = ['tester', 'basic', 'starter', 'delivery', 'premium', 'enterprise']
const STATUSES = ['trial', 'active', 'pending', 'cancelled']

const STATUS_COLOR = {
  trial:     { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399' },
  active:    { bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.3)',   text: '#60a5fa' },
  pending:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
}

function Badge({ value, map }) {
  const c = map[value] || map['cancelled']
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, borderRadius: 5, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
      {value}
    </span>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <div style={{ color: 'var(--text-2)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || 'var(--text-1)', fontWeight: 800, fontSize: '1.8rem' }}>{value}</div>
    </div>
  )
}

function UserEditModal({ user, onClose, onSaved }) {
  const [plan, setPlan] = useState(user.plan || 'tester')
  const [planStatus, setPlanStatus] = useState(user.plan_status || 'trial')
  const [isActive, setIsActive] = useState(user.is_active)
  const [isAdmin, setIsAdmin] = useState(user.is_admin || false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await adminService.patchUser(user.id, { plan, plan_status: planStatus, is_active: isActive, is_admin: isAdmin })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '100%' }}>
        <h3 style={{ color: 'var(--text-1)', marginBottom: 4 }}>Editar usuário</h3>
        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{user.email}</p>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Plano</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} style={{ width: '100%' }}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Status</label>
            <select value={planStatus} onChange={e => setPlanStatus(e.target.value)} style={{ width: '100%' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Conta ativa
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
              Administrador
            </label>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ width: '100%', marginBottom: '0.75rem' }}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function Admin() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [expandedUser, setExpandedUser] = useState(null)
  const [userRoutes, setUserRoutes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers({ search: search || undefined }),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleExpandUser = async (userId) => {
    if (expandedUser === userId) { setExpandedUser(null); return }
    setExpandedUser(userId)
    if (!userRoutes[userId]) {
      try {
        const res = await adminService.getUserRoutes(userId)
        setUserRoutes(prev => ({ ...prev, [userId]: res.data }))
      } catch (_) {}
    }
  }

  const handleDeleteRoute = async (userId, routeId) => {
    if (!window.confirm('Deletar esta rota?')) return
    try {
      await adminService.deleteRoute(userId, routeId)
      setUserRoutes(prev => ({
        ...prev,
        [userId]: prev[userId].filter(r => r.id !== routeId),
      }))
    } catch (_) {}
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Admin
        </div>
        <h1 style={{ color: 'var(--text-1)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>Painel Administrativo</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Gerencie usuários, planos e assinaturas.</p>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.9rem 1.25rem', color: '#f87171', marginBottom: '1.5rem' }}>{error}</div>}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Usuários" value={stats.total_users} />
          <StatCard label="Assinaturas ativas" value={stats.active_subscriptions} color="#60a5fa" />
          <StatCard label="Em trial" value={stats.trial_users} color="#34d399" />
          <StatCard label="Total rotas" value={stats.total_routes} />
          <StatCard label="Rotas hoje" value={stats.routes_today} color="#f59e0b" />
        </div>
      )}

      {stats?.plan_distribution && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ color: 'var(--text-2)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Distribuição de planos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {Object.entries(stats.plan_distribution).map(([plan, count]) => (
              <div key={plan} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1.1rem' }}>{count}</div>
                <div style={{ color: 'var(--text-2)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>{plan}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1rem', flex: 1 }}>Usuários</h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome..."
            style={{ width: 260, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          />
          <button className="btn-secondary" onClick={load} disabled={loading} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {loading ? '...' : '↺ Atualizar'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-2)' }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ID', 'Nome', 'Email', 'Plano', 'Status', 'Rotas hoje', 'Cadastro', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-2)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <React.Fragment key={u.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)', fontSize: '0.8rem' }}>{u.id}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-1)', fontSize: '0.85rem', fontWeight: 500 }}>
                        {u.full_name}
                        {u.is_admin && <span style={{ marginLeft: 4, fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}> ★</span>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)', fontSize: '0.82rem' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge value={u.plan || 'tester'} map={Object.fromEntries(PLANS.map(p => [p, { bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.2)', text: 'var(--primary-light)' }]))} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge value={u.plan_status || 'trial'} map={STATUS_COLOR} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-1)', fontSize: '0.85rem', fontWeight: 600 }}>
                        {u.routes_used_today}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setEditUser(u)}
                            style={{ padding: '0.35rem 0.75rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 6, color: 'var(--primary-light)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleExpandUser(u.id)}
                            style={{ padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            {expandedUser === u.id ? '▲ Rotas' : '▼ Rotas'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedUser === u.id && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                        <td colSpan={8} style={{ padding: '0.75rem 1.5rem 1rem' }}>
                          {!userRoutes[u.id] ? (
                            <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Carregando rotas...</span>
                          ) : userRoutes[u.id].length === 0 ? (
                            <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Nenhuma rota.</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {userRoutes[u.id].map(r => (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.9rem', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--text-1)', fontSize: '0.85rem', fontWeight: 500 }}>{r.name || 'Rota sem nome'}</span>
                                    <span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>{r.waypoints_count} paradas</span>
                                    {r.total_distance_km && <span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>{r.total_distance_km} km</span>}
                                    <span style={{ color: 'var(--text-2)', fontSize: '0.75rem' }}>{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteRoute(u.id, r.id)}
                                    style={{ padding: '0.3rem 0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    Deletar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

export default Admin

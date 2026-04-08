import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Save, X, Filter } from 'lucide-react';

export default function TimeLogger() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterUser, setFilterUser] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    userId: '', projectId: '', description: '', hours: '', date: new Date().toISOString().substring(0, 10)
  });

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTasks = async () => {
    try {
      const uRes = await fetch('/api/users').then(r => r.json());
      const pRes = await fetch('/api/projects').then(r => r.json());
      const tRes = await fetch('/api/tasks').then(r => r.json());
      if(Array.isArray(uRes)) setUsers(uRes);
      if(Array.isArray(pRes)) setProjects(pRes);
      if(Array.isArray(tRes)) setTasks(tRes);
      setLoading(false);
    } catch(e) {
      console.error(e);
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(formData.userId),
          projectId: Number(formData.projectId),
          description: formData.description,
          hours: Number(formData.hours),
          date: new Date(formData.date).toISOString()
        })
      });
      const data = await res.json();
      if (!data.error) {
        setTasks([...tasks, data]);
        setFormData({ ...formData, description: '', hours: '' });
        showToast("✓ Registro añadido correctamente");
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if(res.ok) {
        setTasks(tasks.filter(t => t.id !== id));
        showToast("🗑️ Registro eliminado");
      }
    } catch(err) {
      alert(err.message);
    }
  };

  const handleEditSave = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(editData.userId),
          projectId: Number(editData.projectId),
          description: editData.description,
          hours: Number(editData.hours),
          date: new Date(editData.date).toISOString()
        })
      });
      const data = await res.json();
      if(!data.error) {
        setTasks(tasks.map(t => t.id === id ? data : t));
        setEditingId(null);
        showToast("✓ Cambios guardados");
      } else {
        alert(data.error);
      }
    } catch(err) {
      alert(err.message);
    }
  };

  const getUserName = (id) => users.find(u => u.id === id)?.name || id;
  const getProjectCode = (id) => projects.find(p => p.id === id)?.code || id;

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if(filterUser && t.userId !== Number(filterUser)) return false;
      if(filterProject && t.projectId !== Number(filterProject)) return false;
      if(filterDateFrom && new Date(t.date) < new Date(filterDateFrom)) return false;
      if(filterDateTo && new Date(t.date) > new Date(filterDateTo)) return false;
      return true;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [tasks, filterUser, filterProject, filterDateFrom, filterDateTo]);

  // KPIs
  const sumsByConsultant = useMemo(() => {
    const s = {};
    filteredTasks.forEach(t => { const n = getUserName(t.userId); s[n] = (s[n]||0) + t.hours; });
    return s;
  }, [filteredTasks, users]);

  const sumsByProject = useMemo(() => {
    const s = {};
    filteredTasks.forEach(t => { const p = getProjectCode(t.projectId); s[p] = (s[p]||0) + t.hours; });
    return s;
  }, [filteredTasks, projects]);

  const totalFilteredHours = filteredTasks.reduce((acc, val) => acc + val.hours, 0);

  if (loading) return <div>Cargando módulo de tiempos...</div>;

  return (
    <div style={{ position: 'relative' }}>
      {successMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: '#1E293B', color: '#fff',
          padding: '12px 24px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100, fontWeight: 600, animation: 'fadeInUp 0.3s ease-out'
        }}>
          {successMsg}
        </div>
      )}

      {/* Title & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Registro de Horas (Timesheets)</h3>
          <p style={{ fontSize: 12, color: '#64748B' }}>Historial y control de actividades facturables por consultor.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Filter size={16} color="#64748B" />
          <select className="input" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}>
            <option value="">Consultor...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="input" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}>
            <option value="">Proyecto...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
            <span>Rango:</span>
            <input type="date" className="input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 6 }} />
            <input type="date" className="input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 6 }} />
          </div>
        </div>
      </div>

      {/* Analytics Sum */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 40, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Horas Totales (Filtro)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10B981' }}>{totalFilteredHours} <span style={{ fontSize: 16 }}>h</span></div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 32, overflowX: 'auto', paddingBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>REPORTE POR PROYECTO</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {Object.entries(sumsByProject).map(([k,v]) => (
                <div key={k} style={{ background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{k}:</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', marginLeft: 6 }}>{v}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        
        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ maxHeight: 500 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#F8FAFC' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Consultor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Proyecto</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Descripción</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>Hrs</th>
                  <th style={{ width: 90, textAlign: 'center', fontSize: 12, color: '#64748B' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: 13 }}>No se encontraron registros de tiempos.</td></tr>
                ) : filteredTasks.map(t => {
                  const isEditing = editingId === t.id;
                  
                  if(isEditing) {
                    return (
                      <tr key={t.id} style={{ background: '#F0F9FF', borderLeft: '4px solid #0EA5E9' }}>
                        <td style={{ padding: '8px' }}><input type="date" value={editData.date.substring(0,10)} onChange={e => setEditData({...editData, date: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1' }} /></td>
                        <td style={{ padding: '8px' }}>
                          <select value={editData.userId} onChange={e => setEditData({...editData, userId: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1' }}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select value={editData.projectId} onChange={e => setEditData({...editData, projectId: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1' }}>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}><input type="text" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1' }} /></td>
                        <td style={{ padding: '8px' }}><input type="number" step="0.5" value={editData.hours} onChange={e => setEditData({...editData, hours: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1', textAlign: 'center' }} /></td>
                        <td style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center', padding: '12px 8px' }}>
                          <button onClick={() => handleEditSave(t.id)} style={{ color: '#059669', background: '#D1FAE5', border: 'none', padding: 6, borderRadius: 4, cursor: 'pointer' }}><Save size={16} /></button>
                          <button onClick={() => setEditingId(null)} style={{ color: '#DC2626', background: '#FEE2E2', border: 'none', padding: 6, borderRadius: 4, cursor: 'pointer' }}><X size={16} /></button>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B' }}>{new Date(t.date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: '#1E293B' }}>{getUserName(t.userId)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', fontWeight: 700 }}>{getProjectCode(t.projectId)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{t.description}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#059669', textAlign: 'center' }}>{t.hours}h</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                          <button onClick={() => { setEditingId(t.id); setEditData(t); }} className="btn-icon" style={{ color: '#64748B', padding: 4 }} title="Editar"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(t.id)} className="btn-icon" style={{ color: '#EF4444', padding: 4 }} title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Input Form */}
        <div className="card" style={{ padding: 24, background: '#fff', border: '1px solid #E2E8F0' }}>
          <h4 style={{ marginBottom: 20, fontSize: 14, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }}></span>
            Registrar Labor
          </h4>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>Consultor</label>
              <select className="input" required value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccione...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>Proyecto</label>
              <select className="input" required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}>
                <option value="">Seleccione...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>Descripción</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} placeholder="¿Qué hiciste?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>Fecha</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>Horas</label>
                <input required type="number" step="0.5" value={formData.hours} onChange={e => setFormData({...formData, hours: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13 }} placeholder="0.0" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 8, padding: '12px', fontWeight: 700 }}>Añadir Registro</button>
          </form>
        </div>

      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-icon:hover { background: #F1F5F9; border-radius: 4px; }
      `}</style>
    </div>
  );
}

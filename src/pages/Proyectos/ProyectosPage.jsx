import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newProject, setNewProject] = useState({
    code: '',
    name: '',
    clientId: '',
    budgetHours: 0,
    budgetMs: 0
  });
  
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients')
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      if(Array.isArray(pData)) setProyectos(pData);
      if(Array.isArray(cData)) setClientes(cData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, status: 'EN PROCESO' })
      });
      const data = await res.json();
      if(data.id) {
        setProyectos([data, ...proyectos]);
        setShowModal(false);
        setNewProject({ code: '', name: '', clientId: '', budgetHours: 0, budgetMs: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProyectos = useMemo(() => {
    if (statusFilter === 'TODOS') return proyectos;
    return proyectos.filter(p => p.status === statusFilter);
  }, [proyectos, statusFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A19' }}>Gestión de Proyectos</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="card" style={{ padding: '8px 12px', margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={16} color="#64748B" />
            <select className="input" style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', fontWeight: 500 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="TODOS">Todos los Estados</option>
              <option value="EN PROCESO">Activos (En Proceso)</option>
              <option value="EN PAUSA">En Pausa</option>
              <option value="CERRADO">Cerrados</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo Proyecto</button>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 420, padding: 32, position: 'relative', background: '#fff' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Nuevo Proyecto</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Código del Proyecto</label>
                <input required className="input" style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} placeholder="Ej. P-2024-001" value={newProject.code} onChange={e => setNewProject({...newProject, code: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Nombre descriptivo</label>
                <input required className="input" style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} placeholder="Ej. Diseño Planta Sur" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Cliente Vinculado</label>
                <select required className="input" style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, background: '#fff' }} value={newProject.clientId} onChange={e => setNewProject({...newProject, clientId: e.target.value})}>
                  <option value="">Seleccione un cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Horas Presup.</label>
                  <input type="number" className="input" style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} value={newProject.budgetHours} onChange={e => setNewProject({...newProject, budgetHours: Number(e.target.value)})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Presupuesto (Ms)</label>
                  <input type="number" step="0.01" className="input" style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} value={newProject.budgetMs} onChange={e => setNewProject({...newProject, budgetMs: Number(e.target.value)})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>{loading ? 'Creando...' : 'Crear Proyecto'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="table-container">
        <table style={{ width: '100%' }}>
          <thead style={{ backgroundColor: '#EBEBEA' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Código</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nombre del Proyecto</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Presupuesto (h)</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Salud Presupuestal (Burn)</th>
            </tr>
          </thead>
          <tbody>
            {filteredProyectos.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6B6B67' }}>No hay proyectos registrados para este filtro.</td></tr>
            ) : filteredProyectos.map(p => {
              const burnPercent = p.budgetHours > 0 ? (p.consumedHours / p.budgetHours) * 100 : 0;
              const isCritical = burnPercent > 80;
              
              return (
                <tr 
                  key={p.id} 
                  onClick={() => navigate(`/proyectos/${p.id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
                  className="hover-row"
                >
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1E40AF' }}>{p.code}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>$ {p.budgetMs?.toLocaleString()} Ms</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${p.status === 'EN PROCESO' ? 'badge-amber' : p.status === 'CERRADO' ? 'badge-gray' : 'badge-red'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                    {p.consumedHours} <span style={{ color: '#94A3B8', fontWeight: 400 }}>/ {p.budgetHours}</span>
                  </td>
                  <td style={{ padding: '14px 16px', width: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(burnPercent, 100)}%`, 
                          backgroundColor: isCritical ? '#EF4444' : burnPercent > 60 ? '#F59E0B' : '#10B981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: isCritical ? '#DC2626' : '#1E293B', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {Math.round(burnPercent)}%
                        {isCritical && <span title="¡Alerta de Consumo Crítico!" style={{ animation: 'bounce 1s infinite' }}>⚠️</span>}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

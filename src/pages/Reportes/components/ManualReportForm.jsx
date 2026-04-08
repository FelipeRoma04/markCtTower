import React, { useState, useEffect } from 'react';
import { Plus, FileText, Briefcase } from 'lucide-react';

export default function ManualReportForm({ onAddReport }) {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    cod: '',
    cliente: '',
    projectId: '',
    prog: '',
    real: ''
  });

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setProjects(data); })
      .catch(console.error);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cod || !formData.prog) {
      alert("El código y la fecha programada son obligatorios.");
      return;
    }
    
    const selectedProj = projects.find(p => p.id === parseInt(formData.projectId));
    
    onAddReport({
      cod: formData.cod,
      cliente: selectedProj?.client?.name || formData.cliente || 'Interno',
      proyecto: selectedProj?.name || '—',
      projectId: formData.projectId ? parseInt(formData.projectId) : null,
      prog: formData.prog,
      real: formData.real || null
    });
    
    setFormData({ cod: '', cliente: '', projectId: '', prog: '', real: '' });
  };

  return (
    <div className="card" style={{ marginBottom: 24, background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '24px' }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={20} color="#EF9F27" />
        Registro Manual de Entrega
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Código / ID Reporte</label>
          <input required type="text" className="input" placeholder="MCT-2024..." value={formData.cod} onChange={e => setFormData({...formData, cod: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Vincular Proyecto</label>
          <div style={{ position: 'relative' }}>
            <Briefcase size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', zIndex: 1 }} />
            <select className="input" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} style={{ width: '100%', padding: '10px 14px 10px 34px', border: '1px solid #CBD5E1', borderRadius: 8, appearance: 'none', background: '#fff' }}>
              <option value="">Seleccionar Proyecto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Prog. Entrega</label>
          <input required type="date" className="input" value={formData.prog} onChange={e => setFormData({...formData, prog: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Fecha Real (Opcional)</label>
          <input type="date" className="input" value={formData.real} onChange={e => setFormData({...formData, real: e.target.value})} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ height: 44, fontWeight: 700, borderRadius: 8 }}>
          Guardar Entregable
        </button>
      </form>
    </div>
  );
}

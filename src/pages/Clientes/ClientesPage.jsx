import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, X, Download, UserPlus, Briefcase, Users, Phone, Mail, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const EMPTY_FORM = { name: '', email: '', phone: '', contacts: [] };

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [detailClient, setDetailClient] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setClientes(data); })
      .catch(console.error);
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes;
    const q = search.toLowerCase();
    return clientes.filter(c => {
      const basicMatch = c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q));
      
      if (basicMatch) return true;

      // Search inside contacts
      let contacts = [];
      try {
        contacts = typeof c.contacts === 'string' ? JSON.parse(c.contacts) : (c.contacts || []);
      } catch(e) { contacts = []; }

      return contacts.some(ct => 
        (ct.name && ct.name.toLowerCase().includes(q)) ||
        (ct.role && ct.role.toLowerCase().includes(q)) ||
        (ct.info && ct.info.toLowerCase().includes(q))
      );
    });
  }, [clientes, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    let parsedContacts = [];
    try {
      parsedContacts = typeof c.contacts === 'string' ? JSON.parse(c.contacts) : (c.contacts || []);
    } catch(e) { parsedContacts = []; }

    setEditingId(c.id);
    setFormData({ 
      name: c.name, 
      email: c.email || '', 
      phone: c.phone || '', 
      contacts: parsedContacts 
    });
    setFormError('');
    setEmailAvailable(null);
    setShowForm(true);
  };

  const handleEmailChange = (val) => {
    setFormData({ ...formData, email: val });
    if (!val) {
      setEmailAvailable(null);
      return;
    }
    
    // Simple debounce/check logic
    setEmailChecking(true);
    const existing = clientes.find(c => c.email?.toLowerCase() === val.toLowerCase() && c.id !== editingId);
    if (existing) {
      setEmailAvailable(false);
      setFormError(`El email "${val}" ya está registrado.`);
    } else {
      setEmailAvailable(true);
      setFormError('');
    }
    setEmailChecking(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      const url = editingId ? `/api/clients/${editingId}` : '/api/clients';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contacts: JSON.stringify(formData.contacts || [])
        })
      });
      const data = await res.json();
      if (res.status === 409) {
        setFormError(data.error);
      } else if (data.error) {
        setFormError(data.error);
      } else {
        if (editingId) {
          setClientes(clientes.map(c => c.id === editingId ? { ...data, projects: data.projects || [] } : c));
        } else {
          setClientes([data, ...clientes]);
        }
        setShowForm(false);
        setFormData(EMPTY_FORM);
        setEditingId(null);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      setClientes(clientes.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = () => {
    const rows = filtered.map(c => ({
      ID: c.id,
      Nombre: c.name,
      Email: c.email || '',
      Teléfono: c.phone || '',
      Proyectos: c.projects?.length || 0
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'Directorio_Clientes.xlsx');
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(29, 158, 117); // brand color
    doc.text('Directorio de Clientes markCtTower', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total clientes: ${filtered.length}`, 14, 33);
    
    // Draw table
    let y = 45;
    const headers = ['Nombre', 'Email', 'Teléfono', 'Projs'];
    const colWidths = [70, 60, 40, 15];
    
    // Header Row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y-5, 182, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    let x = 15;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    
    y += 10;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(51, 65, 85);

    filtered.forEach((c, index) => {
      if (y > 270) { doc.addPage(); y = 20; }
      let xRow = 15;
      doc.text(c.name.substring(0, 35), xRow, y); xRow += colWidths[0];
      doc.text((c.email || '—').substring(0, 30), xRow, y); xRow += colWidths[1];
      doc.text((c.phone || '—').substring(0, 20), xRow, y); xRow += colWidths[2];
      doc.text(String(c.projects?.length || 0), xRow, y);
      
      y += 8;
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y-5, 196, y-5);
    });

    doc.save('Directorio_Clientes_MCT.pdf');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A19' }}>Directorio de Clientes</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 10 }} />
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre, email, teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 32px', border: '1px solid #E2E8F0', borderRadius: 8, width: 260, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={handleExport} title="Exportar a Excel">
              <Download size={15} /> Excel
            </button>
            <button className="btn btn-outline" onClick={handleExportPDF} title="Exportar a PDF">
              <FileText size={15} /> PDF
            </button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 440, padding: 28, position: 'relative', background: '#fff' }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <div style={{ maxHeight: '70vh', overflow: 'auto', paddingRight: 4 }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Nombre Empresa / Cliente *</label>
                    <input required type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Ecopetrol S.A." style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Email Principal</label>
                    <div style={{ position: 'relative' }}>
                      <input type="email" className="input" value={formData.email} onChange={e => handleEmailChange(e.target.value)} placeholder="contacto@empresa.com" style={{ width: '100%', padding: '10px 14px', border: `1px solid ${emailAvailable === false ? '#EF4444' : '#CBD5E1'}`, borderRadius: 8, paddingRight: 32 }} />
                      {emailAvailable === false && <AlertCircle size={14} color="#EF4444" style={{ position: 'absolute', right: 10, top: 12 }} />}
                      {emailAvailable === true && <div style={{ color: '#10B981', position: 'absolute', right: 10, top: 12, fontSize: 10, fontWeight: 800 }}>✓</div>}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Teléfono General</label>
                    <input type="text" className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+57 300..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8 }} />
                  </div>
                </div>

                <div style={{ marginTop: 8, borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> DIRECTORIO DE CONTACTOS
                    </div>
                    <button type="button" className="btn btn-outline" style={{ fontSize: 11, height: 28, padding: '0 10px' }} 
                      onClick={() => setFormData({...formData, contacts: [...formData.contacts, { name: '', role: '', info: '' }]})}>
                      <Plus size={12} /> Añadir
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {formData.contacts.map((c, idx) => (
                      <div key={idx} style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', position: 'relative' }}>
                        <button type="button" onClick={() => setFormData({...formData, contacts: formData.contacts.filter((_, i) => i !== idx)})} 
                          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={14}/></button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <input type="text" placeholder="Nombre" value={c.name} onChange={e => {
                            const nc = [...formData.contacts]; nc[idx].name = e.target.value; setFormData({...formData, contacts: nc});
                          }} style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: 4 }} />
                          <input type="text" placeholder="Cargo" value={c.role} onChange={e => {
                            const nc = [...formData.contacts]; nc[idx].role = e.target.value; setFormData({...formData, contacts: nc});
                          }} style={{ fontSize: 12, padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: 4 }} />
                          <input type="text" placeholder="Correo / Tel" value={c.info} onChange={e => {
                            const nc = [...formData.contacts]; nc[idx].info = e.target.value; setFormData({...formData, contacts: nc});
                          }} style={{ gridColumn: 'span 2', fontSize: 12, padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                    {formData.contacts.length === 0 && <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '10px 0' }}>No hay contactos asociados.</div>}
                  </div>
                </div>

                {formError && (
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#991B1B', borderRadius: 6, fontSize: 13, border: '1px solid #FECACA' }}>
                    ⚠️ {formError}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 40 }} disabled={loading}>
                    {loading ? 'Guardando...' : (editingId ? 'Actualizar Cliente' : 'Crear Cliente')}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 620, padding: 32, maxHeight: '90vh', overflow: 'hidden', position: 'relative', background: '#fff' }}>
            <button onClick={() => setDetailClient(null)} style={{ position: 'absolute', top: 20, right: 20, background: '#F1F5F9', border: 'none', cursor: 'pointer', color: '#64748B', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <div style={{ marginBottom: 24, borderBottom: '1px solid #F1F5F9', paddingBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                 <div style={{ background: '#378ADD', color: '#fff', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
                   {detailClient.name.charAt(0)}
                 </div>
                 <div>
                   <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>{detailClient.name}</h3>
                   <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    {detailClient.email && <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> {detailClient.email}</div>}
                    {detailClient.phone && <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {detailClient.phone}</div>}
                  </div>
                 </div>
              </div>
            </div>

            <div style={{ maxHeight: '60vh', overflow: 'auto', paddingRight: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Proyectos Activos</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{detailClient.projects?.length || 0}</div>
                  </div>
                  <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Valor Total</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>$ {detailClient.projects?.reduce((acc, p) => acc + (p.budgetMs || 0), 0).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Progreso Promedio</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#3B82F6' }}>
                      {detailClient.projects?.length > 0 
                        ? Math.round(detailClient.projects.reduce((acc, p) => acc + (p.status === 'CERRADO' ? 100 : 33), 0) / detailClient.projects.length) 
                        : 0}%
                    </div>
                  </div>
                </div>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, textTransform: 'uppercase' }}>
                    <Briefcase size={14} /> Gestión de Proyectos
                  </div>
                  {(!detailClient.projects || detailClient.projects.length === 0) ? (
                    <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 8, textAlign: 'center', color: '#94A3B8', fontSize: 13, border: '1px dashed #E2E8F0' }}>
                      No tiene proyectos asignados actualmente.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {detailClient.projects.map(p => (
                        <div key={p.id} className="hover-row" 
                          onClick={() => window.location.href = `/proyectos/${p.id}`}
                          style={{ cursor: 'pointer', padding: '14px 18px', border: '1px solid #E2E8F0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', transition: 'all 0.2s' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{p.code}</span>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{p.name}</div>
                              <Eye size={12} color="#94A3B8" />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                               <div style={{ fontSize: 11, color: '#64748B' }}>Presupuesto: <span style={{ fontWeight: 600, color: '#475569' }}>$ {p.budgetMs?.toLocaleString()}</span></div>
                               <div style={{ fontSize: 11, color: '#64748B' }}>Horas: <span style={{ fontWeight: 600, color: '#475569' }}>{p.budgetHours}h</span></div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`badge ${p.status === 'EN PROCESO' ? 'badge-amber' : p.status === 'CERRADO' ? 'badge-gray' : 'badge-red'}`} style={{ fontSize: 10 }}>{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, textTransform: 'uppercase' }}>
                    <Users size={14} /> Directorio de Contactos
                  </div>
                  {(!detailClient.contacts || (typeof detailClient.contacts === 'string' ? JSON.parse(detailClient.contacts).length === 0 : detailClient.contacts.length === 0)) ? (
                    <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 8, textAlign: 'center', color: '#94A3B8', fontSize: 13, border: '1px dashed #E2E8F0' }}>
                      No hay contactos registrados.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {(typeof detailClient.contacts === 'string' ? JSON.parse(detailClient.contacts) : detailClient.contacts).map((contact, i) => (
                        <div key={i} style={{ padding: 14, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{contact.name || 'Sin nombre'}</div>
                          <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600, marginBottom: 8 }}>{contact.role || 'Sin cargo'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                            <Mail size={12} /> {contact.info || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table style={{ width: '100%' }}>
          <thead style={{ backgroundColor: '#EBEBEA' }}>
            <tr>
              <th>Nombre del Cliente</th>
              <th>Email de Contacto</th>
              <th>Teléfono</th>
              <th>Proyectos</th>
              <th style={{ textAlign: 'center', width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6B6B67' }}>
                {search ? 'No hay clientes que coincidan con la búsqueda.' : 'No hay clientes registrados.'}
              </td></tr>
            ) : filtered.map(c => {
              const activeProjs = c.projects?.filter(p => p.status === 'EN PROCESO').length || 0;
              const hasAlert = c.projects?.some(p => p.consumedHours > (p.budgetHours * 0.9));
              
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{activeProjs} proy. activos</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#64748B' }}>{c.email || '—'}</td>
                  <td style={{ color: '#64748B' }}>{c.phone || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <TrendingUp size={14} color={hasAlert ? '#EF4444' : '#10B981'} />
                       <span style={{ fontWeight: 600, color: hasAlert ? '#EF4444' : '#10B981', fontSize: 12 }}>
                         {hasAlert ? 'Riesgo' : 'Saludable'}
                       </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        className="btn-icon"
                        title="Ver detalle"
                        onClick={() => setDetailClient(c)}
                        style={{ background: '#EFF6FF', color: '#1D4ED8' }}
                      ><Eye size={14} /></button>
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => openEdit(c)}
                        style={{ background: '#F8FAFC', color: '#475569' }}
                      ><Edit2 size={14} /></button>
                      <button
                        className="btn-icon"
                        title="Eliminar"
                        onClick={() => handleDelete(c.id, c.name)}
                        style={{ background: '#FEF2F2', color: '#B91C1C' }}
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

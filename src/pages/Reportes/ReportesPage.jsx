import React, { useState, useEffect, useMemo } from 'react';
import { localCache } from '../../utils/localCache';
import { UploadCloud, Filter, Plus, FileText, Briefcase, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ManualReportForm from './components/ManualReportForm';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ReportesPage() {
  const [data, setData] = useState(false);
  const [reportes, setReportes] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    fetch('/api/cache/reportes')
      .then(r => r.json())
      .then(parsed => {
        if (parsed && parsed.reportes) {
          setReportes(parsed.reportes);
          setData(true);
          localCache.set('reportes', { reportes: parsed.reportes });
        } else {
          const cached = localCache.get('reportes');
          if (cached && cached.reportes) { setReportes(cached.reportes); setData(true); }
        }
      }).catch(() => {
        const cached = localCache.get('reportes');
        if (cached && cached.reportes) { setReportes(cached.reportes); setData(true); }
      });
  }, []);

  const saveData = (reps) => {
    localCache.set('reportes', { reportes: reps });
    fetch('/api/cache/reportes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportes: reps })
    }).catch(console.error);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets['REPORTES'];
        if (!ws) {
          alert('No se encontró la hoja "REPORTES"');
          return;
        }
        parseData(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }));
      } catch (err) {
        alert("Error: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseData = (raw) => {
    const map = {};
    for (let i = 6; i < raw.length; i++) {
        const row = raw[i];
        if(!row) continue;
        const cod = row[8] ? String(row[8]).trim() : null;
        if (!cod || cod === '0') continue;
        
        const rptReal = row[13] ? new Date(row[13]) : null;
        const rptProg = row[12] ? new Date(row[12]) : null;
        
        if (!map[cod]) {
            map[cod] = { 
                cod, 
                cliente: row[1] ? String(row[1]).trim() : '—', 
                proyecto: row[2] ? String(row[2]).trim() : '—',
                prog: rptProg && !isNaN(rptProg.getTime()) ? rptProg.toISOString().substring(0,10) : '—',
                real: rptReal && !isNaN(rptReal.getTime()) ? rptReal.toISOString().substring(0,10) : '—'
            };
        }
    }
    const enriched = Object.values(map);
    setReportes(enriched);
    setData(true);
    saveData(enriched);
  };

  const handleAddReport = async (newRep) => {
    try {
      const res = await fetch('/api/technical-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRep)
      });
      const saved = await res.json();
      
      let updated;
      const existingIndex = reportes.findIndex(r => r.cod.toLowerCase() === saved.cod.toLowerCase());
      if (existingIndex >= 0) {
        updated = [...reportes];
        updated[existingIndex] = saved;
      } else {
        updated = [saved, ...reportes];
      }
      
      setReportes(updated);
      localCache.set('reportes', { reportes: updated });
      setShowForm(false);
    } catch (e) {
      console.error(e);
      alert('Error al guardar el reporte.');
    }
  };

  const handleDeleteReport = async (id, cod) => {
    if (!confirm(`¿Seguro que deseas eliminar el reporte ${cod}?`)) return;
    try {
      await fetch(`/api/technical-reports/${id}`, { method: 'DELETE' });
      const updated = reportes.filter(r => r.id !== id);
      setReportes(updated);
      localCache.set('reportes', { reportes: updated });
    } catch (e) {
      console.error(e);
    }
  };

  const processedRecords = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return reportes.map(r => {
      const rptReal = r.real && r.real !== '—' ? new Date(r.real+'T00:00:00') : null;
      const rptProg = r.prog && r.prog !== '—' ? new Date(r.prog+'T00:00:00') : null;
      
      let timeStatus = 'pendiente_ok'; 
      let badgeColor = 'badge-gray';
      let label = 'PROGRAMADO';
      let statusIcon = '📅';

      if (rptReal) {
         if (rptProg && rptReal > rptProg) { 
           timeStatus = 'entregado_tarde'; 
           badgeColor = 'badge-amber'; 
           label = 'ENTREGADO (TARDE)'; 
           statusIcon = '⚠️';
         } else { 
           timeStatus = 'entregado_ok'; 
           badgeColor = 'badge-green'; 
           label = 'ENTREGADO (A TIEMPO)'; 
           statusIcon = '✅';
         }
      } else {
         if (rptProg && today > rptProg) { 
           timeStatus = 'pendiente_retrasado'; 
           badgeColor = 'badge-red'; 
           label = 'CRÍTICO (RETARDO)'; 
           statusIcon = '🚨';
         } else { 
           timeStatus = 'pendiente_ok'; 
           badgeColor = 'badge-gray'; 
           label = 'PROGRAMADO'; 
           statusIcon = '📅';
         }
      }
      return { ...r, timeStatus, badgeColor, label, statusIcon };
    });
  }, [reportes]);

  const filtered = useMemo(() => {
    if(!filterQuery) return processedRecords;
    const q = filterQuery.toLowerCase();
    return processedRecords.filter(r => 
      r.cliente.toLowerCase().includes(q) || 
      r.cod.toLowerCase().includes(q) ||
      (r.proyecto && r.proyecto.toLowerCase().includes(q))
    );
  }, [processedRecords, filterQuery]);

  const chartsAndStats = useMemo(() => {
    const stats = { dOk: 0, dLate: 0, pOk: 0, pLate: 0 };
    filtered.forEach(r => {
      if(r.timeStatus === 'entregado_ok') stats.dOk++;
      else if(r.timeStatus === 'entregado_tarde') stats.dLate++;
      else if(r.timeStatus === 'pendiente_ok') stats.pOk++;
      else if(r.timeStatus === 'pendiente_retrasado') stats.pLate++;
    });

    const totalE = stats.dOk + stats.dLate;
    const totalP = stats.pOk + stats.pLate;
    const total = totalE + totalP;

    return {
      statusChart: {
        labels: ['Entregados', 'Pendientes'],
        datasets: [{
          data: [totalE, totalP],
          backgroundColor: ['#10B981', '#F59E0B'], borderWidth: 0, hoverOffset: 4
        }]
      },
      punctualityChart: {
        labels: ['A Tiempo', 'Con Retraso/Demora'],
        datasets: [{
          data: [stats.dOk + stats.pOk, stats.dLate + stats.pLate],
          backgroundColor: ['#3B82F6', '#EF4444'], borderWidth: 0, hoverOffset: 4
        }]
      },
      stats, total
    };
  }, [filtered]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>Entregables Técnicos</h2>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Seguimiento técnico y control de calidad de informes.</p>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8 }} onClick={() => setShowForm(!showForm)}>
              <Plus size={18} /> Registro Manual 
            </button>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8 }} onClick={() => document.getElementById('reportes-file').click()}>
              <UploadCloud size={18} /> Subir Excel Maestro
              <input type="file" id="reportes-file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            </button>
            <button className="btn btn-danger-outline" onClick={() => {
              if(confirm("¿Seguro que deseas limpiar la base de datos de reportes?")) {
                fetch('/api/cache/reportes', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(null)
                }).then(() => { setData(false); setReportes([]); });
              }
            }}>Limpiar</button>
          </div>
        )}
      </div>
      
      {!data ? (
        <div style={{ maxWidth: 640, margin: '60px auto' }}>
          <div className="upload-zone" onClick={() => document.getElementById('reportes-file-init').click()}>
            <input type="file" id="reportes-file-init" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            <UploadCloud size={64} color="#EF9F27" style={{ margin: '0 auto 24px', opacity: 0.8 }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              Carga tu Matriz de Reportes (Excel)
            </div>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              Analizaremos automáticamente las fechas de cierre programado contra las reales para generar el semáforo de cumplimiento.
            </p>
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
             <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => setData(true)}>
               <Plus size={18} style={{ marginRight: 8 }} /> Inicializar base vacía
             </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {showForm && (
            <ManualReportForm onAddReport={handleAddReport} />
          )}

          {/* KPIs & Semáforo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3B82F6' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Total Registros</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>{chartsAndStats.total}</div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Estado de Salud (Semáforo)</div>
              <div style={{ display: 'flex', gap: 8, height: 40 }}>
                <div style={{ flex: 1, background: '#10B981', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, opacity: chartsAndStats.stats.dOk > 0 ? 1 : 0.2 }} title="A Tiempo">
                  {chartsAndStats.stats.dOk}
                </div>
                <div style={{ flex: 1, background: '#F59E0B', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, opacity: chartsAndStats.stats.dLate > 0 ? 1 : 0.2 }} title="Con Retraso">
                  {chartsAndStats.stats.dLate}
                </div>
                <div style={{ flex: 1, background: '#EF4444', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, opacity: chartsAndStats.stats.pLate > 0 ? 1 : 0.2, animation: chartsAndStats.stats.pLate > 0 ? 'pulse 2s infinite' : 'none' }} title="Crítico">
                  {chartsAndStats.stats.pLate}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Índice de Eficiencia</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10B981' }}>
                {chartsAndStats.total ? Math.round(((chartsAndStats.stats.dOk + chartsAndStats.stats.pOk) / chartsAndStats.total) * 100) : 0}%
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', background: '#F1F5F9' }}>
             <Filter size={20} color="#64748B" />
             <input 
               type="text" 
               className="input" 
               placeholder="Filtrar por Cliente, Proyecto o Código de reporte..." 
               value={filterQuery} 
               onChange={e => setFilterQuery(e.target.value)} 
               style={{ flex: 1, padding: '10px 16px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 14 }} 
             />
             <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
               {filtered.length} resultados encontrados
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-title" style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>Histórico de Entregables</div>
              <div className="table-container" style={{ maxHeight: 650 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#F8FAFC' }}>
                    <tr>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Código</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Cliente / Proyecto</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>Programado</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>Real</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Estado</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>No hay registros coincidentes.</td></tr>
                    ) : filtered.slice(0, 100).map((r, idx) => (
                      <tr key={r.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 800, color: '#1E293B', fontSize: 13 }}>{r.cod}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{r.cliente}</div>
                          <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Briefcase size={10} /> {r.proyecto}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: 12, color: '#475569' }}>{r.prog}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: r.real === '—' ? '#94A3B8' : '#10B981' }}>
                          {r.real === '—' ? '—' : r.real}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span className={`badge ${r.badgeColor}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 10 }}>
                            <span>{r.statusIcon}</span>
                            {r.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <button 
                            className="btn-icon-danger" 
                            onClick={() => handleDeleteReport(r.id, r.cod)}
                            style={{ padding: 6, cursor: 'pointer', background: 'none', border: 'none', color: '#EF4444' }}
                            title="Eliminar registro"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="card-title" style={{ width: '100%', marginBottom: 16 }}>Avance Global</div>
                <div style={{ width: 220, height: 220 }}>
                  <Doughnut 
                    data={chartsAndStats.statusChart} 
                    options={{ 
                      maintainAspectRatio: false, 
                      cutout: '75%', 
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } 
                    }} 
                  />
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="card-title" style={{ width: '100%', marginBottom: 16 }}>Control Puntualidad</div>
                <div style={{ width: 220, height: 220 }}>
                  <Doughnut 
                    data={chartsAndStats.punctualityChart} 
                    options={{ 
                      maintainAspectRatio: false, 
                      cutout: '75%', 
                      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } 
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

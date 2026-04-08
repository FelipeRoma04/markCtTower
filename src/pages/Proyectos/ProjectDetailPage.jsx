import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, Target, DollarSign, Activity, FileText, CheckCircle2, Calendar } from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch project
    fetch(`/api/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        return fetch('/api/cache/reportes');
      })
      .then(res => res.json())
      .then(cache => {
         if(cache && cache.reportes) {
           setReportes(cache.reportes);
         }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const stats = useMemo(() => {
    if (!project) return null;
    const tasks = project.tasks || [];
    const consumedHours = tasks.reduce((sum, t) => sum + t.hours, 0);
    const budgetHours = project.budgetHours || 1; // avoid div by zero
    const budgetMs = project.budgetMs || 0;
    
    // Hour Burn rate
    const hourAdvance = (consumedHours / budgetHours) * 100;
    
    // Project Progress based on reports delivered
    const totalReports = project.reports?.length || 0;
    const deliveredReports = project.reports?.filter(r => r.real && r.real !== '—').length || 0;
    const progressPercent = totalReports > 0 ? (deliveredReports / totalReports) * 100 : 0;

    // Efficiency check: if hours consumed > progress percent, we have an efficiency leak
    const efficiencyAlert = hourAdvance > progressPercent + 20 && project.status !== 'CERRADO';

    return { 
      consumedHours, 
      budgetHours, 
      budgetMs, 
      hourAdvance, 
      projectProgress: Math.round(progressPercent),
      isBurning: hourAdvance > 80,
      efficiencyAlert
    };
  }, [project]);

  const processedReports = useMemo(() => {
    if(!project || !project.reports) return [];
    
    return project.reports.map(r => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const rptReal = r.real && r.real !== '—' ? new Date(r.real+'T00:00:00') : null;
      const rptProg = r.prog && r.prog !== '—' ? new Date(r.prog+'T00:00:00') : null;
      
      let type = 'PROGRAMADO';
      let color = '#64748B'; 
      if (rptReal) {
        if (rptProg && rptReal > rptProg) { type = 'TARDE'; color = '#F59E0B'; }
        else { type = 'A TIEMPO'; color = '#10B981'; }
      } else if (rptProg && today > rptProg) {
        type = 'CRÍTICO'; color = '#EF4444';
      }
      return { ...r, eventType: 'REPORT', type, color, date: r.real && r.real !== '—' ? r.real : r.prog };
    });
  }, [project]);

  const unifiedTimeline = useMemo(() => {
    if (!project) return [];
    const taskEvents = (project.tasks || []).map(t => ({
      ...t, eventType: 'TASK', color: '#3B82F6', date: t.date 
    }));
    
    const allEvents = [...taskEvents, ...processedReports];
    return allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [project, processedReports]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando detalles...</div>;
  if (!project || project.error) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>Proyecto no encontrado.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/proyectos" className="btn btn-outline" style={{ padding: '8px 12px' }}><ArrowLeft size={16} /></Link>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.025em' }}>
            {project.code} — {project.name}
          </h2>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Cliente:</span>
            <Link to="/clientes" style={{ fontWeight: 700, color: '#378ADD', textDecoration: 'none' }}>
              {project.client?.name || 'Varios'}
            </Link>
            <span style={{ color: '#E2E8F0' }}>|</span>
            <span>Estado:</span>
            <span className={`badge ${project.status === 'EN PROCESO' ? 'badge-amber' : project.status === 'CERRADO' ? 'badge-gray' : 'badge-red'}`} style={{ fontWeight: 700 }}>{project.status}</span>
          </div>
        </div>
      </div>

      {stats.isBurning && (
        <div style={{ padding: 16, backgroundColor: '#FEF2F2', borderLeft: '4px solid #DC2626', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle color="#DC2626" />
          <span style={{ color: '#991B1B', fontWeight: 600 }}>¡Alerta de Presupuesto!</span>
          <span style={{ color: '#7F1D1D' }}>Se ha consumido el {stats.hourAdvance.toFixed(1)}% de las horas asignadas al proyecto.</span>
        </div>
      )}

      {/* Burn Rate & Advance Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: '24px', border: stats.isBurning ? '2px solid #EF4444' : '1px solid #E2E8F0', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Consumo de Horas</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: stats.isBurning ? '#DC2626' : '#0F172A' }}>{stats.hourAdvance.toFixed(1)}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Meta: {stats.budgetHours}h</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{stats.consumedHours}h Ejecutadas</div>
            </div>
          </div>
          <div style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(stats.hourAdvance, 100)}%`, backgroundColor: stats.isBurning ? '#EF4444' : '#3B82F6', transition: 'width 1s' }} />
          </div>
        </div>

        <div className="card" style={{ padding: '24px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Avance del Proyecto</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{stats.projectProgress}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Entregables</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{project.reports?.filter(r=>r.real && r.real!=='—').length || 0} / {project.reports?.length || 0}</div>
            </div>
          </div>
          <div style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.projectProgress}%`, backgroundColor: '#10B981', transition: 'width 1s' }} />
          </div>
        </div>
      </div>

      {/* Gantt-lite Milestones Bar */}
      <div className="card" style={{ padding: '20px', background: '#fff' }}>
        <h3 style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} /> Cronograma de Entregables Técnicos
        </h3>
        <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center', padding: '0 40px' }}>
          {/* Horizontal Line */}
          <div style={{ position: 'absolute', left: 40, right: 40, height: 4, background: '#F1F5F9', borderRadius: 2 }} />
          
          {processedReports.map((r, i) => {
            // Estimate position based on index since we don't have hard project start/end dates for calculations yet
            const pos = processedReports.length > 1 ? (i / (processedReports.length - 1)) * 100 : 50;
            return (
              <div key={i} style={{ position: 'absolute', left: `calc(${pos}% + 40px)`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div style={{ padding: '4px 8px', background: r.color, color: 'white', borderRadius: 6, fontSize: 10, fontWeight: 800, marginBottom: 8, whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {r.cod}
                </div>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', border: `3px solid ${r.color}` }} />
                <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, marginTop: 4 }}>{r.prog}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        
        {/* Timeline Section */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>CRONOGRAMA DE EJECUCIÓN</h3>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Seguimiento histórico de hitos y dedicación</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }} /> HORAS
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} /> HITOS
               </div>
            </div>
          </div>
          
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {unifiedTimeline.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: 20 }}>No hay eventos registrados en la línea de tiempo.</p>
            ) : unifiedTimeline.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, position: 'relative', paddingBottom: 32 }}>
                {i !== unifiedTimeline.length - 1 && (
                    <div style={{ position: 'absolute', top: 32, bottom: 0, left: 15, width: 2, background: 'linear-gradient(to bottom, #E2E8F0, #F8FAFC)' }} />
                )}
                
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', border: `2px solid ${ev.color || '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {ev.eventType === 'REPORT' ? <CheckCircle2 size={16} color={ev.color} /> : <Clock size={16} color={ev.color} />}
                </div>

                <div style={{ background: ev.eventType === 'REPORT' ? '#F0FDF4' : '#fff', padding: '16px 20px', borderRadius: 12, flex: 1, border: `1px solid ${ev.eventType === 'REPORT' ? '#DCFCE7' : '#F1F5F9'}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: ev.color, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} />
                      {new Date(ev.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    {ev.eventType === 'REPORT' && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: ev.color, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                        {ev.type}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 15, color: '#1E293B', fontWeight: 700 }}>
                    {ev.eventType === 'REPORT' ? `Entregable: ${ev.cod}` : ev.description}
                  </div>
                  
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                    {ev.eventType === 'TASK' && (
                      <>
                        <div style={{ fontSize: 12, color: '#64748B' }}>Dedicación: <strong style={{ color: '#0F172A' }}>{ev.hours} horas</strong></div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>Usuario: <strong style={{ color: '#0F172A' }}>{ev.user || 'Sistema'}</strong></div>
                      </>
                    )}
                    {ev.eventType === 'REPORT' && (
                      <Link to="/reportes" style={{ fontSize: 12, color: '#10B981', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Ver Reporte Completo <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Alertas Rápidas */}
          {stats.isBurning && (
            <div style={{ padding: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
               <div style={{ color: '#991B1B', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                 <AlertTriangle size={14} /> CONSUMO CRÍTICO
               </div>
               <p style={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.4 }}>
                 Este proyecto ha superado el 80% de las horas presupuestadas. Se recomienda revisión de rentabilidad.
               </p>
            </div>
          )}

          <div className="card" style={{ background: '#fff' }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>Resumen de Entregables</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {processedReports.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94A3B8' }}>Sin reportes vinculados.</p>
              ) : processedReports.slice(0, 10).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{r.cod}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.type}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-inner {
          0% { box-shadow: inset 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: inset 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: inset 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}

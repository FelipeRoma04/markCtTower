import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, Target, DollarSign, Activity } from 'lucide-react';

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
    const budgetHours = project.budgetHours || 0;
    const budgetMs = project.budgetMs || 0;
    
    // Calculate progress based on tasks vs budget hours
    const hourAdvance = budgetHours > 0 ? (consumedHours / budgetHours) * 100 : 0;
    
    // Status-based progress (rough estimate)
    let projectProgress = 0;
    if (project.status === 'CERRADO') projectProgress = 100;
    else if (project.status === 'EN PROCESO') projectProgress = 33; // Default starting point if not closed
    
    // If we have reports, we can refine progress
    if (project.reports && project.reports.length > 0) {
      const delivered = project.reports.filter(r => r.real && r.real !== '—').length;
      projectProgress = Math.max(projectProgress, Math.round((delivered / project.reports.length) * 100));
    }

    const isBurning = hourAdvance > 80;

    return { 
      consumedHours, 
      budgetHours, 
      budgetMs, 
      hourAdvance, 
      projectProgress,
      isBurning 
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        
        {/* Timeline Section */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>CRONOGRAMA UNIFICADO</h3>
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Timesheets + Hitos de Reportes Técnicos</p>
          </div>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {unifiedTimeline.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center', padding: 20 }}>No hay eventos registrados.</p>
            ) : unifiedTimeline.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: 24 }}>
                {i !== unifiedTimeline.length - 1 && (
                    <div style={{ position: 'absolute', top: 24, bottom: 0, left: 11, width: 2, backgroundColor: '#F1F5F9' }} />
                )}
                
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#fff', border: `3px solid ${ev.color || '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {ev.eventType === 'REPORT' ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color }} /> : null}
                </div>

                <div style={{ background: ev.eventType === 'REPORT' ? '#F8FAFC' : 'transparent', padding: ev.eventType === 'REPORT' ? '12px 16px' : '0', borderRadius: 10, flex: 1, border: ev.eventType === 'REPORT' ? `1px solid ${ev.color}20` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{new Date(ev.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    {ev.eventType === 'REPORT' && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: ev.color, padding: '2px 6px', borderRadius: 4 }}>{ev.type}</span>}
                  </div>

                  <div style={{ fontSize: 14, color: '#0F172A', fontWeight: 600, marginTop: 4 }}>
                    {ev.eventType === 'REPORT' ? `Entrega Reporte: ${ev.cod}` : ev.description}
                  </div>
                  
                  {ev.eventType === 'TASK' && (
                    <div style={{ fontSize: 12, color: '#378ADD', marginTop: 2, fontWeight: 500 }}>
                      Dedicación: {ev.hours} h
                    </div>
                  )}
                  {ev.eventType === 'REPORT' && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                       Programado: {ev.prog} {ev.real !== '—' ? ` | Real: ${ev.real}` : ''}
                    </div>
                  )}
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

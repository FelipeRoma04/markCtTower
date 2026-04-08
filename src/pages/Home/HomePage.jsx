import React, { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ausenciasActivas: 0,
    tareasVencidas: 0,
    reportesPendientes: 0,
    proyectosActivos: 0
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/cache/ausentismo').then(r => r.json()),
      fetch('/api/cache/tareas').then(r => r.json()),
      fetch('/api/cache/reportes').then(r => r.json()),
      fetch('/api/projects').then(r => r.json())
    ]).then(([ausData, tarData, repData, projData]) => {
      let ausencias = 0, tareasVencidas = 0, reportesPendientes = 0, proyectos = 0;

      if (ausData && ausData.records) {
        // Asumiendo ausencias activas si inicio <= hoy <= fin o simplemente sumamos las últimas.
        // Simplificación: sumamos total de ausencias
        ausencias = ausData.kpis?.total || 0;
      }

      if (tarData && tarData.tasks) {
        // Tareas vencidas: días diff < 0 y no realizadas.
        tareasVencidas = tarData.tasks.filter(t => t.progreso !== 'Realizado' && t.dias !== null && t.dias < 0).length;
      }

      if (repData && repData.reportes) {
        // Reportes pendientes: status === 'proceso'
        reportesPendientes = repData.reportes.filter(r => r.status === 'proceso').length;
      }

      if (Array.isArray(projData)) {
        proyectos = projData.filter(p => p.status === 'EN PROCESO').length;
      }

      setStats({
        ausenciasActivas: ausencias,
        tareasVencidas,
        reportesPendientes,
        proyectosActivos: proyectos
      });
      setLoading(false);
    }).catch(e => {
       console.error("Error cargando Dashboard global", e);
       setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando métricas...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A19' }}>Panorama General</h2>
      </div>

      <div className="kpi-grid">
        <div className="kpi-item" style={{ borderBottomColor: '#1A1A19' }}>
          <div className="kpi-label">Proyectos Activos</div>
          <div className="kpi-val">{stats.proyectosActivos}</div>
        </div>
        <div className="kpi-item" style={{ borderBottomColor: '#1D9E75' }}>
          <div className="kpi-label">Ausencias Registradas</div>
          <div className="kpi-val" style={{ color: '#1D9E75' }}>{stats.ausenciasActivas}</div>
        </div>
        <div className="kpi-item" style={{ borderBottomColor: '#DC2626' }}>
          <div className="kpi-label">Tareas Vencidas</div>
          <div className="kpi-val" style={{ color: '#DC2626' }}>{stats.tareasVencidas}</div>
        </div>
        <div className="kpi-item" style={{ borderBottomColor: '#EF9F27' }}>
          <div className="kpi-label">Reportes Pendientes</div>
          <div className="kpi-val" style={{ color: '#EF9F27' }}>{stats.reportesPendientes}</div>
        </div>
      </div>

      <div style={{ marginTop: 40, padding: 24, background: '#E2E8F0', borderRadius: 8 }}>
        <h3 style={{ fontSize: 16 }}>Bienvenido al Sistema ERP markCtTower</h3>
        <p style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>
          Utilice el menú lateral para gestionar el control de tiempos, reportes, tareas y la Base de Roles. 
          Los KPIs superiores muestran recuentos vivos basados en la última actualización de cada módulo.
        </p>
      </div>
    </div>
  );
}

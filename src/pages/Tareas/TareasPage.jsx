import React, { useState, useEffect } from 'react';
import { localCache } from '../../utils/localCache';
import { UploadCloud, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import TimeLogger from './components/TimeLogger';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function TareasPage() {
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [compChartData, setCompChartData] = useState(null);

  useEffect(() => {
    fetch('/api/cache/tareas')
      .then(r => r.json())
      .then(parsed => {
        if (parsed && parsed.tasks) {
          const loadedTasks = parsed.tasks;
          setTasks(loadedTasks);
          
          // Re-calculate if missing (server only stores raw tasks)
          const currentKpis = parsed.kpis || calculateKPIs(loadedTasks);
          const currentCharts = (parsed.chartData && parsed.compChartData) 
            ? { main: parsed.chartData, comp: parsed.compChartData } 
            : generateCharts(loadedTasks);
            
          setKpis(currentKpis);
          setChartData(currentCharts.main);
          setCompChartData(currentCharts.comp);
          setData(true);
          localCache.set('tareas', { tasks: loadedTasks, kpis: currentKpis, chartData: currentCharts.main, compChartData: currentCharts.comp });
        } else {
          const cached = localCache.get('tareas');
          if (cached && cached.tasks) { 
            setTasks(cached.tasks); 
            setKpis(cached.kpis); 
            setChartData(cached.chartData); 
            setCompChartData(cached.compChartData);
            setData(true); 
          }
        }
      }).catch((err) => {
        console.error("Error loading Tareas:", err);
        const cached = localCache.get('tareas');
        if (cached && cached.tasks) { 
          setTasks(cached.tasks); 
          setKpis(cached.kpis); 
          setChartData(cached.chartData); 
          setCompChartData(cached.compChartData);
          setData(true); 
        }
      });
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array', cellDates: true });
        parseWorkbook(wb);
      } catch (err) {
        alert("Error al leer Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseWorkbook = (wb) => {
    const skipSheets = ['INSTRUCCIONES', 'RESUMEN', 'instrucciones', 'resumen'];
    const allTasks = [];
    
    wb.SheetNames.forEach(sheetName => {
      if (skipSheets.some(s => sheetName.toLowerCase().includes(s.toLowerCase()))) return;
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      if (!rows || rows.length < 3) return;

      let headerIdx = -1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        if (!rows[i]) continue;
        const joined = rows[i].map(c => String(c||'')).join('|').toUpperCase();
        if (joined.includes('CATEGOR') || joined.includes('ACTIVIDAD')) { headerIdx = i; break; }
      }
      if (headerIdx === -1) return;

      const col = {};
      rows[headerIdx].forEach((h, i) => {
        const str = String(h||'').toUpperCase();
        if (str.includes('CATEGOR')) col.cat = i;
        else if (str.includes('ACTIVIDAD') || str.includes('TAREA')) col.act = i;
        else if (str.includes('RESPONSABLE')) col.resp = i;
        else if (str.includes('PROGRAMADA')) col.fProg = i;
        else if (str.includes('CUMPLIMIENTO') && str.includes('FECHA')) col.fCumpl = i;
        else if (str.includes('PROGRESO')) col.progreso = i;
        else if (str.includes('D') && str.includes('AS') && str.includes('DIF')) col.dias = i;
      });

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;
        const cat = col.cat !== undefined ? String(row[col.cat]||'').trim() : '';
        const act = col.act !== undefined ? String(row[col.act]||'').trim() : '';
        if (!cat || !act) continue;

        let progreso = col.progreso !== undefined ? String(row[col.progreso]||'').trim() : 'Sin estado';
        if (!progreso) progreso = 'Sin estado';

        let dias = null;
        if (col.dias !== undefined && row[col.dias] !== undefined && row[col.dias] !== '') {
          const d = parseFloat(String(row[col.dias]).replace(',','.'));
          if (!isNaN(d)) dias = Math.round(d);
        }

        allTasks.push({
          id: i,
          cat,
          act,
          resp: col.resp !== undefined ? String(row[col.resp]||'').trim() : '',
          progreso,
          fProg: col.fProg !== undefined ? String(row[col.fProg]||'').trim() : '',
          fCumpl: col.fCumpl !== undefined ? String(row[col.fCumpl]||'').trim() : '',
          dias
        });
      }
    });

    if (allTasks.length > 0) {
      setTasks(allTasks);
      const newKpis = calculateKPIs(allTasks);
      const charts = generateCharts(allTasks);
      setData(true);
      const payload = { 
        tasks: allTasks, 
        kpis: newKpis, 
        chartData: charts.main, 
        compChartData: charts.comp 
      };
      localCache.set('tareas', payload);
      fetch('/api/cache/tareas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(console.error);
    } else {
      alert("No se encontraron tareas en el archivo");
    }
  };

  const calculateKPIs = (dataTasks) => {
    const total = dataTasks.length;
    const real = dataTasks.filter(t => t.progreso === 'Realizado').length;
    const proc = dataTasks.filter(t => t.progreso === 'En proceso').length;
    const sin = dataTasks.filter(t => t.progreso === 'Sin estado').length;
    const pct = total ? Math.round((real / total) * 100) : 0;

    // Find critical category (lowest completion %)
    const catStats = {};
    dataTasks.forEach(t => {
      const c = t.cat || 'General';
      if(!catStats[c]) catStats[c] = { total: 0, done: 0 };
      catStats[c].total++;
      if(t.progreso === 'Realizado') catStats[c].done++;
    });
    let minPct = 101;
    let critCat = 'General';
    Object.entries(catStats).forEach(([cat, s]) => {
      const p = Math.round((s.done / s.total) * 100);
      if(p < minPct) { minPct = p; critCat = cat; }
    });

    const newKpis = { total, real, proc, sin, pct, critCat, critPct: minPct === 101 ? 0 : minPct };
    setKpis(newKpis);
    return newKpis;
  };

  const generateCharts = (dataTasks) => {
    const real = dataTasks.filter(t => t.progreso === 'Realizado').length;
    const proc = dataTasks.filter(t => t.progreso === 'En proceso').length;
    const sin = dataTasks.filter(t => t.progreso === 'Sin estado').length;
    
    const newChartData = {
      labels: ['Realizado', 'En proceso', 'Sin estado'],
      datasets: [
        {
          data: [real, proc, sin],
          backgroundColor: ['#10B981', '#3B82F6', '#94A3B8'],
          hoverOffset: 6,
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };

    // Calculate % Compliance per category for the new chart
    const catGroups = {};
    dataTasks.forEach(t => {
      const c = t.cat || 'General';
      if (!catGroups[c]) catGroups[c] = { total: 0, done: 0 };
      catGroups[c].total++;
      if (t.progreso === 'Realizado') catGroups[c].done++;
    });

    const complianceLabels = Object.keys(catGroups);
    const complianceValues = complianceLabels.map(l => 
      Math.round((catGroups[l].done / catGroups[l].total) * 100)
    );

    const newCompChartData = {
      labels: complianceLabels,
      datasets: [{
        label: '% Cumplimiento',
        data: complianceValues,
        backgroundColor: complianceValues.map(v => v >= 100 ? '#10B981' : v > 50 ? '#3B82F6' : '#F59E0B'),
        borderRadius: 6,
        barThickness: 12
      }]
    };

    setChartData(newChartData);
    setCompChartData(newCompChartData); // Assuming we add this state
    return { main: newChartData, comp: newCompChartData };
  };

  const catChartData = React.useMemo(() => {
    if(!tasks || tasks.length === 0) return null;
    const groups = {};
    tasks.forEach(t => {
      const c = t.cat || 'Sin Categoría';
      if(!groups[c]) groups[c] = { real: 0, proc: 0, sin: 0 };
      if(t.progreso === 'Realizado') groups[c].real++;
      else if(t.progreso === 'En proceso') groups[c].proc++;
      else groups[c].sin++;
    });
    const labels = Object.keys(groups);
    return {
      labels,
      datasets: [
        { label: 'Realizado', data: labels.map(l => groups[l].real), backgroundColor: '#10B981', borderRadius: 4 },
        { label: 'En proceso', data: labels.map(l => groups[l].proc), backgroundColor: '#3B82F6', borderRadius: 4 },
        { label: 'Sin estado', data: labels.map(l => groups[l].sin), backgroundColor: '#94A3B8', borderRadius: 4 }
      ]
    };
  }, [tasks]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em' }}>Seguimiento de Tareas</h2>
        {data && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => {
              document.getElementById('tareas-file').click();
            }}>
              <UploadCloud size={16} /> Reemplazar Matriz
              <input type="file" id="tareas-file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            </button>
            <button className="btn btn-danger-outline" onClick={() => {
              if(confirm("¿Seguro que deseas borrar la base de tareas?")) {
                fetch('/api/cache/tareas', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(null)
                }).then(() => setData(null));
              }
            }}>Borrar Base</button>
          </div>
        )}
      </div>
      
      {!data ? (
        <div style={{ maxWidth: 640, margin: '40px auto' }}>
          <div className="upload-zone" onClick={() => document.getElementById('tareas-file-init').click()}>
            <input type="file" id="tareas-file-init" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            <UploadCloud size={64} color="#3B82F6" style={{ margin: '0 auto 20px', opacity: 0.8 }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
              Carga tu Matriz de Tareas (Excel)
            </div>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>
              El dashboard generará el cumplimiento por categoría y detectará tareas vencidas automáticamente.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="kpi-item" style={{ borderLeft: '4px solid #CBD5E1' }}>
              <div className="kpi-label">Total Tareas</div>
              <div className="kpi-val" style={{ color: '#0F172A' }}>{kpis.total}</div>
            </div>
            <div className="kpi-item accent">
              <div className="kpi-label">% General</div>
              <div className="kpi-val green">{kpis.pct}%</div>
            </div>
            <div className="kpi-item warn" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
              <div className="kpi-label">Categoría Crítica</div>
              <div className="kpi-val amber" style={{ fontSize: 16, marginTop: 4 }}>{kpis.critCat}</div>
              <div style={{ fontSize: 11, color: '#9A3412', fontWeight: 600 }}>Cump: {kpis.critPct}%</div>
            </div>
            <div className="kpi-item" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
              <div className="kpi-label">Tareas Vencidas</div>
              <div className="kpi-val red">{tasks.filter(t => t.progreso !== 'Realizado' && t.dias !== null && t.dias < 0).length}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24 }}>
            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-title" style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>Detalle de Actividades (Top 100)</div>
              <div className="table-container" style={{ maxHeight: 600 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#F8FAFC' }}>
                    <tr>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Categoría</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Actividad</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Resp.</th>
                      <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 12, color: '#64748B' }}>Días</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, color: '#64748B' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.slice(0, 100).map((t, idx) => {
                      const isOverdue = t.progreso !== 'Realizado' && t.dias !== null && t.dias < 0;
                      return (
                      <tr key={idx} style={{ background: isOverdue ? '#FFF1F2' : 'transparent' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: 4 }}>{t.cat}</span>
                        </td>
                        <td style={{ padding: '12px 20px', maxWidth: 240, wordWrap: 'break-word', fontSize: 13, color: '#1E293B', fontWeight: 500 }}>{t.act}</td>
                        <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748B' }}>{t.resp || '—'}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <div style={{ 
                            background: t.dias === null ? '#F1F5F9' : t.dias < 0 ? '#EF4444' : '#10B981',
                            color: t.dias === null ? '#64748B' : '#fff',
                            fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 4, display: 'inline-block', minWidth: 32
                          }}>
                            {t.dias === null ? '—' : t.dias > 0 ? `+${t.dias}` : t.dias}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`badge ${t.progreso === 'Realizado' ? 'badge-green' : t.progreso === 'En proceso' ? 'badge-blue' : 'badge-gray'}`}>
                              {t.progreso}
                            </span>
                            {isOverdue && (
                              <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 4, animation: 'pulse 2s infinite' }}>VENCIDA</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="card-title" style={{ width: '100%', marginBottom: 16 }}>Distribución de Estados</div>
                {chartData && (
                  <div style={{ width: 220, height: 220 }}>
                    <Doughnut 
                      data={chartData} 
                      options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }} 
                    />
                  </div>
                )}
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="card-title" style={{ width: '100%', marginBottom: 16 }}>Cumplimiento por Categoría (%)</div>
                {compChartData && (
                  <div style={{ width: '100%', height: 320 }}>
                    <Bar 
                      data={compChartData} 
                      options={{ 
                        maintainAspectRatio: false, 
                        indexAxis: 'y', 
                        scales: { 
                          x: { 
                            beginAtZero: true, 
                            max: 100,
                            grid: { display: true, color: '#f1f5f9' }, 
                            ticks: { 
                              font: { size: 10 },
                              callback: (v) => v + '%'
                            } 
                          }, 
                          y: { 
                            grid: { display: false }, 
                            ticks: { font: { size: 10, weight: 600 } } 
                          } 
                        }, 
                        plugins: { 
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `Cumplimiento: ${ctx.raw}%`
                            }
                          }
                        } 
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Tracking Module */}
      <div style={{ marginTop: 48, borderTop: '2px dashed #E2E8F0', paddingTop: 32 }}>
        <TimeLogger />
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

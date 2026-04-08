import React, { useState, useMemo, useEffect } from 'react';
import { UploadCloud, Download, Filter, Plus, FilePlus } from 'lucide-react';
import { localCache } from '../../utils/localCache';
import * as XLSX from 'xlsx';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import ManualAbsenceForm from './components/ManualAbsenceForm';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function AusentismoPage() {
  const [data, setData] = useState(false);
  const [records, setRecords] = useState([]);
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    fetch('/api/cache/ausentismo')
      .then(r => r.json())
      .then(parsed => {
        if (parsed && parsed.records) {
          setRecords(parsed.records);
          setData(true);
          localCache.set('ausentismo', { records: parsed.records, kpis: parsed.kpis });
        } else {
          // Fallback to localStorage
          const cached = localCache.get('ausentismo');
          if (cached && cached.records) { setRecords(cached.records); setData(true); }
        }
      }).catch(() => {
        const cached = localCache.get('ausentismo');
        if (cached && cached.records) { setRecords(cached.records); setData(true); }
      });
  }, []);

  const saveToBackend = async (newRecords) => {
    try {
      const payload = { records: newRecords };
      const res = await fetch('/api/cache/ausentismo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      // Re-fetch to be sure
      const fetchNew = await fetch('/api/cache/ausentismo').then(r => r.json());
      if (fetchNew && fetchNew.records) {
        setRecords(fetchNew.records);
        localCache.set('ausentismo', fetchNew);
        if (result.skipped > 0) {
            alert(`Importación completada. Se omitieron ${result.skipped} registros por solapamiento de fechas.`);
        }
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (d) => {
    if (!d) return '';
    let date;
    if (!isNaN(d) && Number(d) > 30000) {
      date = new Date(Math.round((d - 25569) * 86400 * 1000));
    } else {
      date = new Date(d);
    }
    if (isNaN(date.getTime())) return String(d);
    return date.toISOString().split('T')[0];
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: false });
        const sheetName = wb.SheetNames.includes("Registros") ? "Registros" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        let headerRow = 0;
        for (let i = 0; i < Math.min(raw.length, 10); i++) {
          const row = raw[i].map(c => String(c).toLowerCase());
          if (row.some(c => c.includes("empleado")) && row.some(c => c.includes("fecha"))) {
            headerRow = i; break;
          }
        }
        
        const validRows = [];
        for (let i = headerRow + 1; i < raw.length; i++) {
          if (raw[i] && raw[i].length >= 4 && raw[i][0]) {
            validRows.push({
              emp: String(raw[i][0]).trim(),
              tipo: raw[i][1] || 'Permiso',
              inicio: formatDate(raw[i][2]),
              fin: formatDate(raw[i][3])
            });
          }
        }
        
        saveToBackend(validRows);
      } catch (err) {
        alert("Error al leer Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddRecord = async (newRec) => {
    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRec)
      });
      
      if (res.status === 409 || res.status === 400) {
        const errData = await res.json();
        alert(errData.error);
        return;
      }
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Error desconocido');
      }
      
      const saved = await res.json();
      const updated = [saved, ...records];
      setRecords(updated);
      localCache.set('ausentismo', { records: updated });
      setShowForm(false);
    } catch (e) {
      console.error(e);
      alert('Error al guardar la ausencia.');
    }
  };

  const parseDateToMonth = (d) => {
    if (!isNaN(d) && Number(d) > 30000) {
      const date = new Date(Math.round((d - 25569)*86400*1000));
      return date.getMonth();
    }
    const dt = new Date(d);
    return isNaN(dt) ? -1 : dt.getMonth();
  };

  // Derived filtered data
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let match = true;
      if (filterEmp && !r.emp.toLowerCase().includes(filterEmp.toLowerCase())) match = false;
      if (filterType && r.tipo !== filterType) match = false;
      
      const rStart = new Date(r.inicio).getTime();
      if (filterStartDate && rStart < new Date(filterStartDate).getTime()) match = false;
      if (filterEndDate && rStart > new Date(filterEndDate).getTime()) match = false;
      
      return match;
    });
  }, [records, filterEmp, filterType, filterStartDate, filterEndDate]);

  const currentKpis = useMemo(() => {
    return {
      total: filteredRecords.length,
      emps: new Set(filteredRecords.map(r => r.emp)).size
    };
  }, [filteredRecords]);

  const typeChart = useMemo(() => {
    const counts = { 'Vacaciones': 0, 'Permiso': 0, 'Incapacidad': 0 };
    filteredRecords.forEach(r => { 
      const t = typeof r.tipo === 'string' ? r.tipo.trim() : 'Permiso';
      if (counts[t] !== undefined) counts[t]++; else counts['Permiso']++; 
    });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        hoverOffset: 4,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [filteredRecords]);

  const monthChart = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const counts = new Array(12).fill(0);
    filteredRecords.forEach(r => {
      const m = parseDateToMonth(r.inicio);
      if (m >= 0 && m < 12) counts[m]++;
    });
    return {
      labels: months,
      datasets: [{
        label: 'Frecuencia',
        data: counts,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3B82F6',
        borderWidth: 1,
        borderRadius: 6
      }]
    };
  }, [filteredRecords]);

  const empChart = useMemo(() => {
    const counts = {};
    filteredRecords.forEach(r => {
      if (counts[r.emp]) counts[r.emp]++;
      else counts[r.emp] = 1;
    });
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    return {
      labels: sorted.map(i => i[0].split(' ')[0]),
      datasets: [{
        label: 'Ausencias',
        data: sorted.map(i => i[1]),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#F59E0B',
        borderWidth: 1,
        borderRadius: 6
      }]
    };
  }, [filteredRecords]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ausencias");
    XLSX.writeFile(wb, "Reporte_Ausencias.xlsx");
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    
    const dashboard = document.getElementById('ausentismo-dashboard');
    const canvas = await html2canvas(dashboard, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save("Reporte_Ausentismo_markCtTower.pdf");
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em' }}>Ausentismo y RRHH</h2>
        {data && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} /> Registro Manual
            </button>
            <button className="btn btn-outline" onClick={() => document.getElementById('ausentismo-file').click()}>
              <UploadCloud size={16} /> Reemplazar Excel
              <input type="file" id="ausentismo-file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            </button>
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={16} /> Excel
            </button>
            <button className="btn btn-outline" onClick={handleExportPDF}>
              <FilePlus size={16} /> PDF
            </button>
            <button className="btn btn-danger-outline" style={{ borderColor: '#FCA5A5', color: '#B91C1C' }} onClick={() => {
              if (confirm("¿Estás seguro de borrar toda la base actual?")) {
                fetch('/api/absences/clear', { method: 'DELETE' })
                  .then(() => { setData(false); setRecords([]); localCache.remove('ausentismo'); });
              }
            }}>Borrar Base</button>
          </div>
        )}
      </div>
      
      {!data ? (
        <div style={{ maxWidth: 640, margin: '40px auto' }}>
          <div className="upload-zone" onClick={() => document.getElementById('ausentismo-file-init').click()}>
            <input type="file" id="ausentismo-file-init" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
            <UploadCloud size={48} color="#1D9E75" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A19', marginBottom: 8 }}>
              Carga tu archivo de Ausentismo (Excel) o Comienza Manualmente
            </div>
            <p style={{ fontSize: 13, color: '#6B6B67' }}>
              Base actual vacía. Puedes subir el template histórico para inicializar.
            </p>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
             <button className="btn btn-primary" onClick={() => setData(true)}><Plus size={16} /> Inicializar base manualmente</button>
          </div>
        </div>
      ) : (
        <div id="ausentismo-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 24, background: '#fff', padding: '10px' }}>
          
          {showForm && (
            <ManualAbsenceForm records={records} onAddRecord={handleAddRecord} />
          )}

          {/* Filters */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontWeight: 600, fontSize: 13 }}>
                <Filter size={16} /> Filtros:
             </div>
             <input type="text" className="input" placeholder="Buscar empleado..." value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4 }} />
             
             <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4 }}>
               <option value="">Todos los tipos</option>
               <option value="Vacaciones">Vacaciones</option>
               <option value="Permiso">Permisos</option>
               <option value="Incapacidad">Incapacidades</option>
             </select>

             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 12, color: '#64748B' }}>Desde:</span>
               <input type="date" className="input" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }} />
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 12, color: '#64748B' }}>Hasta:</span>
               <input type="date" className="input" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4 }} />
             </div>
          </div>

          {/* KPIs and Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="kpi-grid" style={{ marginBottom: 0 }}>
                <div className="kpi-item accent">
                  <div className="kpi-label">Colaboradores Afectados</div>
                  <div className="kpi-val green">{currentKpis.emps}</div>
                </div>
                <div className="kpi-item">
                  <div className="kpi-label">Ausencias Registradas</div>
                  <div className="kpi-val" style={{ color: '#1A1A19' }}>{currentKpis.total}</div>
                </div>
              </div>
              <div className="card" style={{ flex: 1 }}>
                 <div className="card-title">Distribución por Tipo</div>
                 <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
                    <Doughnut data={typeChart} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }} />
                 </div>
              </div>
            </div>

            <div className="card">
               <div className="card-title">Frecuencia Mensual</div>
               <div style={{ height: 300 }}>
                 <Bar data={monthChart} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
               </div>
            </div>
          </div>

          {/* Third Chart: Top Empleados */}
          <div className="card">
             <div className="card-title">Top 5 Empleados con más Ausencias</div>
             <div style={{ height: 200 }}>
               <Bar data={empChart} options={{ maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true } } }} />
             </div>
          </div>

          {/* Table */}
          <div className="card">
             <div className="card-title" style={{ marginBottom: 16 }}>Registro de Eventos ({filteredRecords.length})</div>
            <div className="table-container" style={{ maxHeight: 400 }}>
              <table style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th>Empleado</th>
                    <th>Tipo ausencia</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20, color: '#888' }}>No hay registros para estos filtros.</td></tr>
                  ) : filteredRecords.slice(0, 100).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{r.emp}</td>
                      <td>
                        <span className={`badge ${r.tipo === 'Vacaciones' ? 'badge-green' : r.tipo === 'Incapacidad' ? 'badge-red' : 'badge-amber'}`}>{r.tipo}</span>
                      </td>
                      <td style={{ color: '#666' }}>{r.inicio}</td>
                      <td style={{ color: '#666' }}>{r.fin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRecords.length > 100 && (
                <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#888' }}>Mostrando los primeros 100 registros...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

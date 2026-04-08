import React, { useState } from 'react';

export default function ManualAbsenceForm({ records, onAddRecord }) {
  const [formData, setFormData] = useState({
    emp: '',
    tipo: 'Vacaciones',
    inicio: '',
    fin: ''
  });
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const { emp, tipo, inicio, fin } = formData;

    if (!emp || !inicio || !fin) {
      setError("Todos los campos obligatorios deben llenarse.");
      return;
    }

    const tStart = new Date(inicio).getTime();
    const tEnd = new Date(fin).getTime();

    if (tStart > tEnd) {
      setError("La fecha inicio no puede ser mayor que la fin.");
      return;
    }

    // Validación superposición de fechas
    const isOverlapping = records.some(r => {
      // Ignore if it's not the same employee
      if (r.emp.trim().toLowerCase() !== emp.trim().toLowerCase()) return false;
      
      const parseDate = (d) => {
        if (!d) return NaN;
        // Handle Excel serials (e.g. 45015)
        if (!isNaN(d) && Number(d) > 30000) return new Date(Math.round((d - 25569)*86400*1000)).getTime();
        
        // Handle ISO or common date formats. 
        // We set it to midnight UTC to avoid timezone shifts if checking simple dates
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return NaN;
        return dt.getTime();
      };

      const rStart = parseDate(r.inicio);
      const rEnd = parseDate(r.fin);

      if (isNaN(rStart) || isNaN(rEnd)) return false;

      // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
      return tStart <= rEnd && tEnd >= rStart;
    });

    if (isOverlapping) {
      setError(`Se ha detectado un solapamiento con otra ausencia existente para el empleado ${emp}`);
      return;
    }

    // Success
    onAddRecord({
      emp,
      tipo,
      inicio,
      fin
    });

    setFormData({ emp: '', tipo: 'Vacaciones', inicio: '', fin: '' });
  };

  return (
    <div className="card" style={{ marginBottom: 24, background: '#F8FAFC', border: '1px solid #CBD5E1' }}>
      <h3 style={{ fontSize: 16, marginBottom: 16, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 24, height: 24, background: '#1D9E75', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+</span>
        Registro Manual de Ausencias
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Empleado / Colaborador</label>
          <input required type="text" className="input" placeholder="Nombre completo..." value={formData.emp} onChange={(e) => setFormData({...formData, emp: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Tipo de Ausencia</label>
          <select required className="input" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}>
            <option value="Vacaciones">Vacaciones</option>
            <option value="Permiso">Permiso</option>
            <option value="Incapacidad">Incapacidad</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Fecha Inicio</label>
          <input required type="date" className="input" value={formData.inicio} onChange={(e) => setFormData({...formData, inicio: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Fecha Fin</label>
          <input required type="date" className="input" value={formData.fin} onChange={(e) => setFormData({...formData, fin: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 36 }}>Registrar</button>
        </div>
      </form>
      {error && <div style={{ marginTop: 16, fontSize: 13, background: '#FCEBEB', color: '#A32D2D', padding: '10px 16px', borderRadius: 6, fontWeight: 500 }}>⚠️ {error}</div>}
    </div>
  );
}

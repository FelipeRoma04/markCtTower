import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, User, Search, Menu, Clock, FileWarning, TrendingUp, CheckCircle } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Inicio / Dashboard', path: '/', keywords: ['inicio', 'home', 'dashboard', 'kpi'] },
  { label: 'Ausentismo y RRHH', path: '/ausentismo', keywords: ['ausentismo', 'rrhh', 'vacaciones', 'permiso', 'incapacidad', 'ausencia'] },
  { label: 'Seguimiento de Tareas', path: '/tareas', keywords: ['tareas', 'actividades', 'matriz', 'timesheet', 'horas'] },
  { label: 'Entregas de Reportes', path: '/reportes', keywords: ['reportes', 'entregas', 'mct', 'informe'] },
  { label: 'Directorio de Clientes', path: '/clientes', keywords: ['clientes', 'cliente', 'directorio', 'contacto'] },
  { label: 'Gestión de Proyectos', path: '/proyectos', keywords: ['proyectos', 'proyecto', 'presupuesto', 'cronograma'] },
  { label: 'Gestión de Usuarios', path: '/usuarios', keywords: ['usuarios', 'user', 'rol', 'consultor', 'coordinador'] },
];

const PAGE_TITLES = {
  '/ausentismo': { title: 'Dashboard de Ausentismo', subtitle: 'Gestiona vacaciones, permisos e incapacidades del equipo' },
  '/tareas': { title: 'Seguimiento de Tareas', subtitle: 'Control de actividades y tiempos de cumplimiento' },
  '/reportes': { title: 'Entregas de Reportes', subtitle: 'Monitoreo de tiempos de recepción y entrega al cliente' },
  '/usuarios': { title: 'Gestión de Usuarios', subtitle: 'Administra el acceso de tu equipo al portal markCtTower' },
  '/clientes': { title: 'Directorio de Clientes', subtitle: 'Gestiona tus clientes y proyectos asignados' },
  '/proyectos': { title: 'Gestión de Proyectos', subtitle: 'Control de avance, presupuesto y cronograma' },
};

export default function Topbar({ onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Portal markCtTower', subtitle: 'Bienvenido al sistema' };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mct_read_notifs') || '[]');
    } catch { return []; }
  });

  const buildAlerts = async () => {
    setAlertsLoading(true);
    const list = [];
    try {
      const res = await fetch('/api/alerts/summary');
      const data = await res.json();

      if (data.tasks && data.tasks.length > 0) {
        list.push({
          id: `tasks-${data.tasks.length}-${new Date().getHours()}`, type: 'danger', icon: 'clock',
          title: `${data.tasks.length} tarea${data.tasks.length > 1 ? 's' : ''} vencida${data.tasks.length > 1 ? 's' : ''}`,
          detail: data.tasks.slice(0, 2).map(t => t.act || 'Tarea').join(', ') + (data.tasks.length > 2 ? ` y ${data.tasks.length - 2} más` : ''),
          path: '/tareas', module: 'Tareas'
        });
      }

      if (data.reports && data.reports.length > 0) {
        list.push({
          id: `reports-${data.reports.length}-${new Date().getHours()}`, type: 'warning', icon: 'file',
          title: `${data.reports.length} reporte${data.reports.length > 1 ? 's' : ''} retrasado${data.reports.length > 1 ? 's' : ''}`,
          detail: data.reports.slice(0, 2).map(r => r.cod).join(', ') + (data.reports.length > 2 ? ` y ${data.reports.length - 2} más` : ''),
          path: '/reportes', module: 'Reportes'
        });
      }

      if (data.projects && data.projects.length > 0) {
        list.push({
          id: `projects-${data.projects.length}-${new Date().getHours()}`, type: 'warning', icon: 'trend',
          title: `${data.projects.length} proyecto${data.projects.length > 1 ? 's' : ''} con alto consumo`,
          detail: data.projects.slice(0, 2).map(p => p.code).join(', ') + (data.projects.length > 2 ? ` y ${data.projects.length - 2} más` : ''),
          path: '/proyectos', module: 'Proyectos'
        });
      }
    } catch (e) { console.error(e); }
    setAlerts(list);
    setAlertsLoading(false);
  };

  const unreadAlerts = alerts.filter(a => !readIds.includes(a.id));

  const markAllAsRead = () => {
    const allIds = alerts.map(a => a.id);
    const newRead = [...new Set([...readIds, ...allIds])];
    setReadIds(newRead);
    localStorage.setItem('mct_read_notifs', JSON.stringify(newRead));
  };

  useEffect(() => { buildAlerts(); }, [location.pathname]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(NAV_ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.keywords.some(k => k.includes(q))));
    setShowSearch(true);
  }, [searchQuery]);

  useEffect(() => {
    const h = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const iconForType = (icon) => {
    if (icon === 'clock') return <Clock size={16} color="#DC2626" />;
    if (icon === 'file') return <FileWarning size={16} color="#EF9F27" />;
    if (icon === 'trend') return <TrendingUp size={16} color="#EF9F27" />;
    return <Bell size={16} />;
  };

  return (
    <div className="topbar">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="hamburger-btn" onClick={onToggleSidebar}>
          <Menu size={22} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A19', letterSpacing: '-0.3px' }}>{pageInfo.title}</h1>
          <p className="topbar-subtitle" style={{ fontSize: 12, color: '#6B6B67', marginTop: 2 }}>{pageInfo.subtitle}</p>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative' }} className="topbar-search">
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Búsqueda global..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearch(true)}
            style={{ width: 220, padding: '8px 16px 8px 34px', borderRadius: 20, border: '1px solid #E2E8F0', fontSize: 13, backgroundColor: '#F8FAFC', outline: 'none', fontFamily: 'inherit' }}
          />
          {showSearch && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 300, overflow: 'hidden' }}>
              {searchResults.length === 0
                ? <div style={{ padding: '12px 16px', fontSize: 12, color: '#94A3B8' }}>Sin resultados para "{searchQuery}"</div>
                : searchResults.map(item => (
                  <div key={item.path} onClick={() => { navigate(item.path); setSearchQuery(''); setShowSearch(false); }}
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Search size={13} color="#94A3B8" />{item.label}
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(o => !o); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 6, borderRadius: 8, color: '#6B6B67' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Bell size={20} />
            {unreadAlerts.length > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, background: '#DC2626', color: 'white', borderRadius: '50%', fontSize: 9, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 300, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
                <span style={{ fontSize: 11, color: '#3B82F6', cursor: 'pointer', fontWeight: 600 }} onClick={markAllAsRead}>Marcar leído</span>
              </div>
              {alertsLoading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Verificando módulos...</div>
              ) : alerts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <CheckCircle size={32} color="#1D9E75" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Todo al día</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>No hay alertas pendientes</div>
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {alerts.map(alert => (
                    <div key={alert.id}
                      onClick={() => { navigate(alert.path); setNotifOpen(false); }}
                      style={{ padding: '14px 16px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: alert.type === 'danger' ? '#FEF2F2' : '#FFFBEB', flexShrink: 0 }}>
                        {iconForType(alert.icon)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.title}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.detail}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Módulo: {alert.module}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                <button onClick={() => setNotifOpen(false)} style={{ fontSize: 12, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.1)' }} className="topbar-divider" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="topbar-user">
          <div style={{ textAlign: 'right' }} className="topbar-username">
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A19' }}>Admin MCT</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Coordinador</div>
          </div>
          <div style={{ width: 36, height: 36, background: '#E2E8F0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
            <User size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

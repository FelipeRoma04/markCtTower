import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, CheckSquare, FileText, Users, Briefcase, Home, Shield, X } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const routes = [
    { path: '/', name: 'Inicio', icon: <Home size={20} /> },
    { path: '/ausentismo', name: 'Ausentismo', icon: <CalendarDays size={20} /> },
    { path: '/tareas', name: 'Tareas Equipo', icon: <CheckSquare size={20} /> },
    { path: '/reportes', name: 'Entregables Técnicos', icon: <FileText size={20} /> },
    { path: '/clientes', name: 'Directorio Clientes', icon: <Users size={20} /> },
    { path: '/proyectos', name: 'Proyectos Activos', icon: <Briefcase size={20} /> },
    { path: '/usuarios', name: 'Gestión Usuarios', icon: <Shield size={20} /> },
  ];

  return (
    <div className={`sidebar${isOpen ? ' sidebar-open' : ''}`} style={{ backgroundColor: '#1E3A5F', color: 'white', borderRight: 'none' }}>
      <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ background: '#1D9E75', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
          MCT
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>Dashboard</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>Consultora Ing.</div>
        </div>
        {/* Close button on mobile */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94A3B8', padding: 4, cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <nav style={{ padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 600, paddingLeft: '8px', marginBottom: '4px' }}>
          Módulos
        </div>
        
        {routes.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s',
              color: isActive ? 'white' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderLeft: isActive ? '3px solid #1D9E75' : '3px solid transparent'
            })}
          >
            {route.icon}
            {route.name}
          </NavLink>
        ))}
      </nav>
      
      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#64748B', textAlign: 'center' }}>
        LAA 2026 - Versión MVP
      </div>
    </div>
  );
}

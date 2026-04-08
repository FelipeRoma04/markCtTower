import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';

import AusentismoPage from './pages/Ausentismo/AusentismoPage';
import TareasPage from './pages/Tareas/TareasPage';
import ReportesPage from './pages/Reportes/ReportesPage';
import ClientesPage from './pages/Clientes/ClientesPage';
import ProyectosPage from './pages/Proyectos/ProyectosPage';
import ProjectDetailPage from './pages/Proyectos/ProjectDetailPage';
import HomePage from './pages/Home/HomePage';
import UsuariosPage from './pages/Usuarios/UsuariosPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onToggleSidebar={() => setSidebarOpen(o => !o)} />
        <div className="page-wrapper">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ausentismo" element={<AusentismoPage />} />
            <Route path="/tareas" element={<TareasPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/proyectos" element={<ProyectosPage />} />
            <Route path="/proyectos/:id" element={<ProjectDetailPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;

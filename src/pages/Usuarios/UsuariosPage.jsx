import React, { useState, useEffect } from 'react';

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, []);

  const handleAddUser = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const body = {
      name: data.get('name'),
      email: data.get('email'),
      role: data.get('role')
    };

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(res => res.json()).then(newUser => {
      if(!newUser.error) setUsers([...users, newUser]);
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A19' }}>Gestión de Usuarios markCtTower</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        <div className="table-container">
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: '#EBEBEA' }}>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Core Email</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#6B6B67' }}>No hay usuarios.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'Coordinador' ? 'badge-amber' : 'badge-green'}`}>{u.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Añadir Usuario</h3>
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input name="name" placeholder="Nombre completo" required className="input" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 4 }} />
            <input name="email" type="email" placeholder="Correo electrónico" required className="input" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 4 }} />
            <select name="role" required className="input" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 4 }}>
              <option value="Consultor">Consultor</option>
              <option value="Coordinador">Coordinador</option>
              <option value="Solo lectura">Solo lectura</option>
            </select>
            <button type="submit" className="btn" style={{ background: '#1D9E75', color: 'white', padding: '10px', borderRadius: 4, border: 'none', cursor: 'pointer' }}>Guardar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

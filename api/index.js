const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('dev.db');
const PORT = process.env.PORT || 3001;

// Init Tables
db.prepare('CREATE TABLE IF NOT EXISTS ExcelCache (module TEXT PRIMARY KEY, data TEXT)').run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS TechnicalReport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cod TEXT UNIQUE,
    cliente TEXT,
    proyecto TEXT,
    projectId INTEGER,
    prog TEXT,
    real TEXT,
    FOREIGN KEY (projectId) REFERENCES Project(id)
  )
`).run();

try {
  db.prepare('ALTER TABLE TechnicalReport ADD COLUMN projectId INTEGER').run();
} catch(e) { /* already exists */ }
db.prepare(`
  CREATE TABLE IF NOT EXISTS MatrixTask (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    act TEXT,
    consultor TEXT,
    h_mes REAL,
    h_disp REAL,
    h_prog REAL,
    h_ejec REAL,
    progreso TEXT,
    dias INTEGER,
    color TEXT,
    client TEXT,
    project TEXT
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS AbsenceRecord (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emp TEXT,
    tipo TEXT,
    inicio TEXT,
    fin TEXT
  )
`).run();

try {
  db.prepare('ALTER TABLE Client ADD COLUMN contacts TEXT').run();
} catch(e) { /* already exists */ }

// --- MIGRATION LOGIC (ExcelCache -> Structured Tables) ---
const migrate = () => {
    // Migrate Reports
    const repCount = db.prepare('SELECT count(*) as count FROM TechnicalReport').get().count;
    if (repCount === 0) {
        const row = db.prepare('SELECT data FROM ExcelCache WHERE module = ?').get('reportes');
        if (row && row.data) {
            const parsed = JSON.parse(row.data);
            if (parsed.reportes && Array.isArray(parsed.reportes)) {
                const insert = db.prepare('INSERT OR IGNORE INTO TechnicalReport (cod, cliente, proyecto, prog, real) VALUES (?, ?, ?, ?, ?)');
                const transaction = db.transaction((data) => {
                    for (const r of data) insert.run(r.cod, r.cliente, r.proyecto, r.prog, r.real);
                });
                transaction(parsed.reportes);
                console.log('Migración de Reportes completa.');
            }
        }
    }

    // Migrate Matrix Tasks
    const taskCount = db.prepare('SELECT count(*) as count FROM MatrixTask').get().count;
    if (taskCount === 0) {
        const row = db.prepare('SELECT data FROM ExcelCache WHERE module = ?').get('tareas');
        if (row && row.data) {
            const parsed = JSON.parse(row.data);
            if (parsed.tasks && Array.isArray(parsed.tasks)) {
                const insert = db.prepare(`
                    INSERT INTO MatrixTask (act, consultor, h_mes, h_disp, h_prog, h_ejec, progreso, dias, color, client, project) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                const transaction = db.transaction((data) => {
                    for (const t of data) insert.run(
                        t.act, t.consultor, t.h_mes, t.h_disp, t.h_prog, t.h_ejec, 
                        t.progreso, t.dias, t.color, t.client, t.project
                    );
                });
                transaction(parsed.tasks);
                console.log('Migración de Tareas de Matriz completa.');
            }
        }
    }

    // Migrate Absence Records
    const absCount = db.prepare('SELECT count(*) as count FROM AbsenceRecord').get().count;
    if (absCount === 0) {
        const row = db.prepare('SELECT data FROM ExcelCache WHERE module = ?').get('ausentismo');
        if (row && row.data) {
            const parsed = JSON.parse(row.data);
            if (parsed.records && Array.isArray(parsed.records)) {
                const insert = db.prepare('INSERT INTO AbsenceRecord (emp, tipo, inicio, fin) VALUES (?, ?, ?, ?)');
                const transaction = db.transaction((data) => {
                    for (const r of data) insert.run(r.emp, r.tipo, r.inicio, r.fin);
                });
                transaction(parsed.records);
                console.log('Migración de Ausentismo completa.');
            }
        }
    }
};
migrate();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- EXCEL JSON CACHE (Compatibility) ---
app.get('/api/cache/:module', (req, res) => {
  try {
    const { module } = req.params;
    if (module === 'reportes') {
        const reports = db.prepare('SELECT * FROM TechnicalReport').all();
        return res.json({ reportes: reports });
    }
    if (module === 'tareas') {
        const tasks = db.prepare('SELECT * FROM MatrixTask').all();
        return res.json({ tasks: tasks });
    }
    if (module === 'ausentismo') {
        const records = db.prepare('SELECT * FROM AbsenceRecord').all();
        return res.json({ records: records });
    }
    const row = db.prepare('SELECT data FROM ExcelCache WHERE module = ?').get(module);
    res.json(row ? JSON.parse(row.data) : null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cache/:module', (req, res) => {
  try {
    const { module } = req.params;
    const { body } = req;
    
    if (module === 'reportes' && body && Array.isArray(body.reportes)) {
        db.prepare('DELETE FROM TechnicalReport').run();
        const insert = db.prepare('INSERT INTO TechnicalReport (cod, cliente, proyecto, projectId, prog, real) VALUES (?, ?, ?, ?, ?, ?)');
        const transaction = db.transaction((data) => {
            for (const r of data) insert.run(r.cod, r.cliente, r.proyecto, r.projectId || null, r.prog, r.real);
        });
        transaction(body.reportes);
        return res.json({ success: true, count: body.reportes.length });
    }

    if (module === 'tareas' && body && Array.isArray(body.tasks)) {
        db.prepare('DELETE FROM MatrixTask').run();
        const insert = db.prepare(`
            INSERT INTO MatrixTask (act, consultor, h_mes, h_disp, h_prog, h_ejec, progreso, dias, color, client, project) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const transaction = db.transaction((data) => {
            for (const t of data) insert.run(
                t.act, t.consultor, t.h_mes, t.h_disp, t.h_prog, t.h_ejec, 
                t.progreso, t.dias, t.color, t.client, t.project
            );
        });
        transaction(body.tasks);
        return res.json({ success: true, count: body.tasks.length });
    }

    if (module === 'ausentismo' && body && Array.isArray(body.records)) {
        db.prepare('DELETE FROM AbsenceRecord').run();
        const insert = db.prepare('INSERT INTO AbsenceRecord (emp, tipo, inicio, fin) VALUES (?, ?, ?, ?)');
        const check = db.prepare('SELECT id FROM AbsenceRecord WHERE LOWER(TRIM(emp)) = LOWER(TRIM(?)) AND (inicio <= ? AND fin >= ?)');
        
        const transaction = db.transaction((data) => {
            let skipped = 0;
            for (const r of data) {
                // Pre-check for overlap within the already-inserted rows in this transaction
                const overlap = check.get(r.emp, r.fin, r.inicio);
                if (!overlap) {
                   insert.run(r.emp, r.tipo, r.inicio, r.fin);
                } else {
                   skipped++;
                }
            }
            return skipped;
        });
        const skippedCount = transaction(body.records);
        return res.json({ success: true, count: body.records.length - skippedCount, skipped: skippedCount });
    }

    const jsonStr = JSON.stringify(body);
    db.prepare('INSERT INTO ExcelCache (module, data) VALUES (?, ?) ON CONFLICT(module) DO UPDATE SET data=excluded.data').run(module, jsonStr);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- INDIVIDUAL CRUD: TECHNICAL REPORTS ---
app.post('/api/technical-reports', (req, res) => {
    try {
        const { cod, cliente, proyecto, projectId, prog, real } = req.body;
        const info = db.prepare('INSERT OR REPLACE INTO TechnicalReport (cod, cliente, proyecto, projectId, prog, real) VALUES (?, ?, ?, ?, ?, ?)').run(
            cod, cliente, proyecto, projectId || null, prog, real
        );
        const report = db.prepare('SELECT * FROM TechnicalReport WHERE id = ?').get(info.lastInsertRowid);
        res.json(report);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/technical-reports/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM TechnicalReport WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INDIVIDUAL CRUD: ABSENCES ---
app.post('/api/absences', (req, res) => {
    try {
        const { emp, tipo, inicio, fin } = req.body;
        
        // 🛡️ Validation: Check for date overlap for the same employee
        const overlap = db.prepare(`
            SELECT id FROM AbsenceRecord 
            WHERE LOWER(TRIM(emp)) = LOWER(TRIM(?)) 
            AND (inicio <= ? AND fin >= ?)
        `).get(emp, fin, inicio); // Logic: New[Start] <= Existing[End] && New[End] >= Existing[Start]
        
        if (overlap) {
            return res.status(409).json({ error: `El empleado '${emp}' ya tiene una ausencia registrada que se solapa con estas fechas.` });
        }

        const info = db.prepare('INSERT INTO AbsenceRecord (emp, tipo, inicio, fin) VALUES (?, ?, ?, ?)').run(
            emp, tipo, inicio, fin
        );
        const record = db.prepare('SELECT * FROM AbsenceRecord WHERE id = ?').get(info.lastInsertRowid);
        res.json(record);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/absences/clear', (req, res) => {
    try {
        db.prepare('DELETE FROM AbsenceRecord').run();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- USERS ---
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM User').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { email, name, role, hourlyRate } = req.body;
    const info = db.prepare('INSERT INTO User (email, name, role, hourlyRate) VALUES (?, ?, ?, ?)').run(email, name, role || 'CONSULTOR', hourlyRate || 0.0);
    const user = db.prepare('SELECT * FROM User WHERE id = ?').get(info.lastInsertRowid);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CLIENTS ---
app.get('/api/clients', (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM Client').all();
    const projects = db.prepare('SELECT * FROM Project').all();
    clients.forEach(c => {
      c.projects = projects.filter(p => p.clientId === c.id);
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', (req, res) => {
  try {
    const { name, email, phone, contacts } = req.body;
    if (email) {
      const existing = db.prepare('SELECT id FROM Client WHERE email = ?').get(email);
      if (existing) return res.status(409).json({ error: `El email '${email}' ya está registrado para otro cliente.` });
    }
    const info = db.prepare('INSERT INTO Client (name, email, phone, contacts) VALUES (?, ?, ?, ?)').run(name, email, phone, contacts || '[]');
    const client = db.prepare('SELECT * FROM Client WHERE id = ?').get(info.lastInsertRowid);
    client.projects = [];
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:id', (req, res) => {
  try {
    const { name, email, phone, contacts } = req.body;
    if (email) {
      const existing = db.prepare('SELECT id FROM Client WHERE email = ? AND id != ?').get(email, req.params.id);
      if (existing) return res.status(409).json({ error: `El email '${email}' ya está registrado para otro cliente.` });
    }
    db.prepare('UPDATE Client SET name=?, email=?, phone=?, contacts=? WHERE id=?').run(name, email, phone, contacts || '[]', req.params.id);
    const client = db.prepare('SELECT * FROM Client WHERE id = ?').get(req.params.id);
    client.projects = db.prepare('SELECT * FROM Project WHERE clientId = ?').all(client.id);
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM Client WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- PROJECTS ---
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, COALESCE(SUM(t.hours), 0) as consumedHours 
      FROM Project p 
      LEFT JOIN Task t ON p.id = t.projectId 
      GROUP BY p.id
    `).all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { code, name, clientId, status, budgetMs, budgetHours } = req.body;
    const info = db.prepare('INSERT INTO Project (code, name, clientId, status, budgetMs, budgetHours) VALUES (?, ?, ?, ?, ?, ?)').run(
      code, name, clientId, status || 'EN PROCESO', budgetMs || 0.0, budgetHours || 0.0
    );
    const project = db.prepare('SELECT * FROM Project WHERE id = ?').get(info.lastInsertRowid);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM Project WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    project.client = db.prepare('SELECT * FROM Client WHERE id = ?').get(project.clientId);
    project.tasks = db.prepare('SELECT * FROM Task WHERE projectId = ?').all(project.id);
    project.reports = db.prepare('SELECT * FROM TechnicalReport WHERE projectId = ?').all(project.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const { code, name, clientId, status, budgetMs, budgetHours } = req.body;
    db.prepare('UPDATE Project SET code=?, name=?, clientId=?, status=?, budgetMs=?, budgetHours=? WHERE id=?').run(
      code, name, clientId, status, budgetMs, budgetHours, req.params.id
    );
    const project = db.prepare('SELECT * FROM Project WHERE id = ?').get(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- TASKS (Timesheet) ---
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM Task').all();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { description, projectId, userId, date, hours } = req.body;
    const info = db.prepare('INSERT INTO Task (description, projectId, userId, date, hours) VALUES (?, ?, ?, ?, ?)').run(
      description, projectId, userId, date || new Date().toISOString(), hours
    );
    const task = db.prepare('SELECT * FROM Task WHERE id = ?').get(info.lastInsertRowid);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { description, projectId, userId, date, hours } = req.body;
    db.prepare('UPDATE Task SET description=?, projectId=?, userId=?, date=?, hours=? WHERE id=?').run(
      description, projectId, userId, date, hours, req.params.id
    );
    const task = db.prepare('SELECT * FROM Task WHERE id = ?').get(req.params.id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM Task WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ALERTS CONSOLIDATED ---
app.get('/api/alerts/summary', async (req, res) => {
    try {
        const today = new Date().toISOString().substring(0, 10);
        
        // 1. Overdue Matrix Tasks
        const overdueTasks = db.prepare("SELECT * FROM MatrixTask WHERE progreso != 'Realizado' AND dias < 0").all();
        
        // 2. Late Technical Reports
        const lateReports = db.prepare("SELECT * FROM TechnicalReport WHERE (real IS NULL OR real = '—') AND prog < ?").all(today);
        
        // 3. Projects at Risk (>80% consumed)
        const projects = db.prepare(`
            SELECT p.id, p.code, p.budgetHours, COALESCE(SUM(t.hours), 0) as consumed 
            FROM Project p 
            LEFT JOIN Task t ON p.id = t.projectId 
            GROUP BY p.id
        `).all();
        const riskyProjects = projects.filter(p => p.budgetHours > 0 && (p.consumed / p.budgetHours) > 0.8);

        res.json({
            tasks: overdueTasks,
            reports: lateReports,
            projects: riskyProjects
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 7430;
const DB_FILE = path.join(__dirname, 'tasks.json');

function loadTasks() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return []; }
}

function saveTasks(tasks) {
  fs.writeFileSync(DB_FILE, JSON.stringify(tasks, null, 2));
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const server = http.createServer((req, res) => {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost`);
  const p = url.pathname;

  if (req.method === 'GET' && p === '/tasks') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify(loadTasks())); return;
  }

  if (req.method === 'POST' && p === '/tasks') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const tasks = loadTasks();
        const task = { id: Date.now(), text: data.text || 'Sin título', priority: data.priority || 'medium',
          category: data.category || 'general', done: false, created: new Date().toISOString(), reminder: data.reminder || null };
        tasks.unshift(task);
        saveTasks(tasks);
        res.writeHead(201, {'Content-Type':'application/json'});
        res.end(JSON.stringify(task));
      } catch(e) { res.writeHead(400); res.end('Bad Request'); }
    }); return;
  }

  const idMatch = p.match(/^\/tasks\/(\d+)$/);
  if (idMatch) {
    const id = parseInt(idMatch[1]);
    if (req.method === 'PATCH') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        const tasks = loadTasks();
        const t = tasks.find(t => t.id === id);
        if (!t) { res.writeHead(404); res.end('Not found'); return; }
        Object.assign(t, JSON.parse(body));
        saveTasks(tasks);
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify(t));
      }); return;
    }
    if (req.method === 'DELETE') {
      const tasks = loadTasks();
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) { res.writeHead(404); res.end('Not found'); return; }
      tasks.splice(idx, 1); saveTasks(tasks);
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({deleted: id})); return;
    }
  }

  if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, {'Content-Type':'text/html'}); res.end(html);
    } catch(e) { res.writeHead(404); res.end('index.html not found'); }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => console.log(`SODA TASK SERVER on port ${PORT}`));

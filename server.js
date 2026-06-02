// ============================================================
// 快递管理 — Node.js 本地 Web 服务器
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

const PORT = 8765;
const RENDERER_DIR = path.join(__dirname, 'renderer');
const ASSETS_DIR = path.join(__dirname, 'assets');
const DB_PATH = path.join(__dirname, 'data', 'packages.db');

// ============================================================
// SQLite 初始化
// ============================================================
const initSqlJs = require('sql.js');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();

  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  }
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient       TEXT NOT NULL,
      phone           TEXT NOT NULL,
      pickup_code     TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      photo_path      TEXT DEFAULT '',
      status          TEXT DEFAULT 'unpicked',
      created_date    TEXT NOT NULL,
      created_at      TEXT NOT NULL
    )
  `);
  saveDB();
  console.log('[DB] 数据库就绪');
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ============================================================
// MIME 类型映射
// ============================================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ============================================================
// HTTP 服务器
// ============================================================
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // --- API 路由 ---
  if (pathname.startsWith('/api/')) {
    await handleAPI(req, res, method, pathname, parsedUrl.query);
    return;
  }

  // --- 照片文件 ---
  if (pathname.startsWith('/assets/')) {
    serveFile(res, path.join(__dirname, pathname));
    return;
  }

  // --- 静态文件 ---
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(RENDERER_DIR, filePath);

  // 安全检查：防止目录穿越
  if (!filePath.startsWith(RENDERER_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  serveFile(res, filePath);
});

// ============================================================
// 静态文件服务
// ============================================================
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

// ============================================================
// JSON 辅助
// ============================================================
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ============================================================
// API 路由处理
// ============================================================
async function handleAPI(req, res, method, pathname, query) {
  const apiPath = pathname.replace('/api', '');

  try {
    // GET /api/packages — 获取全部
    if (method === 'GET' && apiPath === '/packages') {
      const stmt = db.prepare('SELECT * FROM packages ORDER BY created_date DESC, created_at DESC');
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      sendJSON(res, rows);
      return;
    }

    // GET /api/packages/search?q=xxx — 搜索
    if (method === 'GET' && apiPath === '/packages/search') {
      const kw = query.q || '';
      const like = `%${kw}%`;
      const stmt = db.prepare(`
        SELECT * FROM packages
        WHERE recipient LIKE $kw OR phone LIKE $kw OR pickup_code LIKE $kw OR tracking_number LIKE $kw
        ORDER BY created_date DESC, created_at DESC
      `);
      stmt.bind({ $kw: like });
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      sendJSON(res, rows);
      return;
    }

    // GET /api/packages/dates — 获取日期列表
    if (method === 'GET' && apiPath === '/packages/dates') {
      const result = db.exec('SELECT DISTINCT created_date FROM packages ORDER BY created_date DESC');
      const dates = result.length > 0 ? result[0].values.map(r => r[0]) : [];
      sendJSON(res, dates);
      return;
    }

    // POST /api/packages — 新增
    if (method === 'POST' && apiPath === '/packages') {
      const pkg = await parseBody(req);
      const stmt = db.prepare(`
        INSERT INTO packages (recipient, phone, pickup_code, tracking_number, photo_path, status, created_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run([
        pkg.recipient, pkg.phone, pkg.pickup_code || '', pkg.tracking_number || '',
        pkg.photo_path || '', pkg.status || 'unpicked', pkg.created_date, pkg.created_at,
      ]);
      // 获取插入的 ID（在 free 之前）
      const idResult = db.exec('SELECT last_insert_rowid() as id');
      const newId = idResult[0].values[0][0];
      stmt.free();
      saveDB();
      sendJSON(res, { success: true, id: newId });
      return;
    }

    // PUT /api/packages/:id — 更新
    const putMatch = apiPath.match(/^\/packages\/(\d+)$/);
    if (method === 'PUT' && putMatch) {
      const id = parseInt(putMatch[1]);
      const pkg = await parseBody(req);
      const stmt = db.prepare(`
        UPDATE packages SET recipient=?, phone=?, pickup_code=?, tracking_number=?, photo_path=?, status=? WHERE id=?
      `);
      stmt.run([pkg.recipient, pkg.phone, pkg.pickup_code || '', pkg.tracking_number || '', pkg.photo_path || '', pkg.status || 'unpicked', id]);
      stmt.free();
      saveDB();
      sendJSON(res, { success: true });
      return;
    }

    // DELETE /api/packages/:id — 删除
    const delMatch = apiPath.match(/^\/packages\/(\d+)$/);
    if (method === 'DELETE' && delMatch) {
      const id = parseInt(delMatch[1]);
      db.run('DELETE FROM packages WHERE id = ?', [id]);
      saveDB();
      sendJSON(res, { success: true });
      return;
    }

    // PATCH /api/packages/:id/toggle — 切换状态
    const toggleMatch = apiPath.match(/^\/packages\/(\d+)\/toggle$/);
    if (method === 'PATCH' && toggleMatch) {
      const id = parseInt(toggleMatch[1]);
      const result = db.exec(`SELECT status FROM packages WHERE id = ${id}`);
      if (result.length === 0 || result[0].values.length === 0) {
        sendJSON(res, { success: false, error: 'Not found' }, 404);
        return;
      }
      const oldStatus = result[0].values[0][0];
      const newStatus = oldStatus === 'picked' ? 'unpicked' : 'picked';
      db.run('UPDATE packages SET status = ? WHERE id = ?', [newStatus, id]);
      saveDB();
      sendJSON(res, { success: true, status: newStatus });
      return;
    }

    // POST /api/photos — 上传照片 (base64)
    if (method === 'POST' && apiPath === '/photos') {
      const body = await parseBody(req);
      const base64Data = body.data;
      const ext = body.ext || '.jpg';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${timestamp}${ext}`;
      const destPath = path.join(ASSETS_DIR, filename);

      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(destPath, buffer);

      sendJSON(res, { success: true, path: `assets/${filename}` });
      return;
    }

    // DELETE /api/photos — 删除照片文件
    if (method === 'DELETE' && apiPath === '/photos') {
      const body = await parseBody(req);
      if (body.path) {
        const fullPath = path.join(__dirname, body.path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
      sendJSON(res, { success: true });
      return;
    }

    // 404
    sendJSON(res, { error: 'API not found' }, 404);
  } catch (err) {
    console.error('[API] Error:', err);
    sendJSON(res, { error: err.message }, 500);
  }
}

// ============================================================
// 启动
// ============================================================
async function start() {
  await initDB();

  server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('  📦 快递管理 v1.0 已启动');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('  本机访问: http://localhost:' + PORT);

    // 显示局域网地址
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log('  局域网访问: http://' + iface.address + ':' + PORT);
        }
      }
    }

    console.log('');
    console.log('  按 Ctrl+C 停止服务器');
    console.log('═══════════════════════════════════════');

    // 自动打开浏览器
    const platform = process.platform;
    let cmd;
    if (platform === 'win32') {
      cmd = `cmd /c start http://localhost:${PORT}`;
    } else if (platform === 'darwin') {
      cmd = `open http://localhost:${PORT}`;
    } else {
      cmd = `xdg-open http://localhost:${PORT}`;
    }
    exec(cmd, (err) => {
      if (err) console.log('请手动打开浏览器访问: http://localhost:' + PORT);
    });
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});

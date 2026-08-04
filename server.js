import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const DEFAULT_JWT_SECRET = 'local-only-change-this-secret';
const DEFAULT_ADMIN_PASSWORD = 'BKKadmin2026!';

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const DATA_FILE = path.join(DATA_DIR, 'site.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Repository files are used only as the first-deploy seed.
const SEED_DATA_FILE = path.join(__dirname, 'data', 'site.json');
const SEED_UPLOAD_DIR = path.join(__dirname, 'uploads');

if (
  IS_PRODUCTION &&
  (JWT_SECRET === DEFAULT_JWT_SECRET || ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD)
) {
  console.error('Production Environment မှာ ADMIN_PASSWORD နဲ့ JWT_SECRET ကို မဖြစ်မနေပြောင်းပါ။');
  process.exit(1);
}

function copyMissingFiles(sourceDir, destinationDir) {
  if (!fs.existsSync(sourceDir)) return;

  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyMissingFiles(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile() && !fs.existsSync(destinationPath)) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function initializeStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    if (!fs.existsSync(SEED_DATA_FILE)) {
      throw new Error('Seed data/site.json မတွေ့ပါ။');
    }

    fs.copyFileSync(SEED_DATA_FILE, DATA_FILE);
    console.log(`✅ Initial site.json ကို ${DATA_FILE} သို့ကူးပြီးပါပြီ။`);
  }

  if (path.resolve(SEED_UPLOAD_DIR) !== path.resolve(UPLOAD_DIR)) {
    copyMissingFiles(SEED_UPLOAD_DIR, UPLOAD_DIR);
  }
}

initializeStorage();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
});

const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('ဒီ Origin မှ API ခေါ်ခွင့်မရှိပါ။'));
      }
    })
  );
}

app.use(express.json({ limit: '2mb' }));
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '30d',
    immutable: true,
    fallthrough: false
  })
);

function readSite() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('site.json ဖတ်မရပါ:', error.message);
    throw new Error('Website data မဖတ်နိုင်ပါ');
  }
}

function writeSite(data) {
  const next = { ...data, updatedAt: new Date().toISOString() };
  const tempPath = `${DATA_FILE}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tempPath, DATA_FILE);

  return next;
}

function cleanText(value, maxLength = 4000) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function cleanUrl(value) {
  const text = cleanText(value, 1000);
  if (!text) return '';
  if (text.startsWith('/') || /^https?:\/\//i.test(text)) return text;
  throw new Error('Link က http://, https:// သို့မဟုတ် / နဲ့စရပါမယ်');
}

function sortVisible(items = []) {
  return items
    .filter((item) => item.active !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Login လိုအပ်ပါတယ်' });
  }

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Login အချိန်ကုန်သွားပါတယ်' });
  }
}

const mimeExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const ext = mimeExtensions[file.mimetype] || '.jpg';
    callback(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = Object.hasOwn(mimeExtensions, file.mimetype);
    callback(
      allowed ? null : new Error('JPG, PNG, WEBP, GIF ပုံသာတင်နိုင်ပါတယ်'),
      allowed
    );
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bkk-landing-api',
    environment: NODE_ENV,
    dataReady: fs.existsSync(DATA_FILE),
    uploadReady: fs.existsSync(UPLOAD_DIR)
  });
});

app.get('/api/public/site', (_req, res) => {
  const data = readSite();

  res.json({
    ok: true,
    data: {
      settings: data.settings,
      promotions: sortVisible(data.promotions),
      events: sortVisible(data.events),
      updatedAt: data.updatedAt
    }
  });
});

app.post('/api/admin/login', async (req, res) => {
  const username = cleanText(req.body?.username, 100);
  const password = String(req.body?.password || '');
  const usernameOk = username === ADMIN_USERNAME;
  const passwordOk = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

  if (!usernameOk || !passwordOk) {
    return res
      .status(401)
      .json({ ok: false, message: 'Username သို့မဟုတ် Password မမှန်ပါ' });
  }

  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, {
    expiresIn: '12h',
    issuer: 'bkk-landing-admin'
  });

  res.json({ ok: true, token, user: { username, role: 'admin' } });
});

app.get('/api/admin/site', auth, (_req, res) => {
  res.json({ ok: true, data: readSite() });
});

app.put('/api/admin/settings', auth, (req, res) => {
  try {
    const data = readSite();
    const input = req.body || {};

    data.settings = {
      ...data.settings,
      brand: cleanText(input.brand, 40),
      brandLong: cleanText(input.brandLong, 80),
      heroKicker: cleanText(input.heroKicker, 150),
      heroTitleTop: cleanText(input.heroTitleTop, 80),
      heroTitleBottom: cleanText(input.heroTitleBottom, 120),
      heroDescription: cleanText(input.heroDescription, 1000),
      gameUrl: cleanUrl(input.gameUrl),
      telegramUrl: cleanUrl(input.telegramUrl),
      contactUrl: cleanUrl(input.contactUrl),
      footerText: cleanText(input.footerText, 300),
      stats: Array.isArray(input.stats)
        ? input.stats.slice(0, 4).map((item) => ({
            value: cleanText(item.value, 30),
            label: cleanText(item.label, 80)
          }))
        : data.settings.stats
    };

    res.json({ ok: true, data: writeSite(data) });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

function normalizePromotion(input, existing = {}) {
  return {
    ...existing,
    id: existing.id || crypto.randomUUID(),
    eyebrow: cleanText(input.eyebrow, 100),
    title: cleanText(input.title, 160),
    short: cleanText(input.short, 500),
    details: cleanText(input.details, 4000),
    image: cleanUrl(input.image),
    badge: cleanText(input.badge, 30),
    buttonText: cleanText(input.buttonText || 'အသေးစိတ်ကြည့်ရန်', 80),
    link: cleanUrl(input.link),
    active: input.active !== false,
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0
  };
}

function normalizeEvent(input, existing = {}) {
  return {
    ...existing,
    id: existing.id || crypto.randomUUID(),
    title: cleanText(input.title, 160),
    date: cleanText(input.date, 120),
    description: cleanText(input.description, 2000),
    image: cleanUrl(input.image),
    link: cleanUrl(input.link),
    active: input.active !== false,
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0
  };
}

app.post('/api/admin/promotions', auth, (req, res) => {
  try {
    const data = readSite();
    const item = normalizePromotion(req.body || {});

    if (!item.title) throw new Error('Promotion Title ထည့်ပါ');

    data.promotions.push(item);
    writeSite(data);
    res.status(201).json({ ok: true, data: item });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.put('/api/admin/promotions/:id', auth, (req, res) => {
  try {
    const data = readSite();
    const index = data.promotions.findIndex((item) => item.id === req.params.id);

    if (index < 0) {
      return res.status(404).json({ ok: false, message: 'Promotion မတွေ့ပါ' });
    }

    data.promotions[index] = normalizePromotion(
      req.body || {},
      data.promotions[index]
    );
    writeSite(data);

    res.json({ ok: true, data: data.promotions[index] });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.delete('/api/admin/promotions/:id', auth, (req, res) => {
  const data = readSite();
  const before = data.promotions.length;

  data.promotions = data.promotions.filter((item) => item.id !== req.params.id);

  if (before === data.promotions.length) {
    return res.status(404).json({ ok: false, message: 'Promotion မတွေ့ပါ' });
  }

  writeSite(data);
  res.json({ ok: true });
});

app.post('/api/admin/events', auth, (req, res) => {
  try {
    const data = readSite();
    const item = normalizeEvent(req.body || {});

    if (!item.title) throw new Error('Event Title ထည့်ပါ');

    data.events.push(item);
    writeSite(data);
    res.status(201).json({ ok: true, data: item });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.put('/api/admin/events/:id', auth, (req, res) => {
  try {
    const data = readSite();
    const index = data.events.findIndex((item) => item.id === req.params.id);

    if (index < 0) {
      return res.status(404).json({ ok: false, message: 'Event မတွေ့ပါ' });
    }

    data.events[index] = normalizeEvent(req.body || {}, data.events[index]);
    writeSite(data);

    res.json({ ok: true, data: data.events[index] });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.delete('/api/admin/events/:id', auth, (req, res) => {
  const data = readSite();
  const before = data.events.length;

  data.events = data.events.filter((item) => item.id !== req.params.id);

  if (before === data.events.length) {
    return res.status(404).json({ ok: false, message: 'Event မတွေ့ပါ' });
  }

  writeSite(data);
  res.json({ ok: true });
});

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'ပုံရွေးပါ' });
  }

  res.status(201).json({ ok: true, url: `/uploads/${req.file.filename}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ ok: false, message: 'ပုံအရွယ် 8 MB ထက်မကျော်ရပါ။' });
  }

  res.status(400).json({ ok: false, message: error.message || 'Server error' });
});

if (IS_PRODUCTION && !fs.existsSync(DIST_DIR)) {
  console.error('Production build dist/ မတွေ့ပါ။ Build Command ကို npm ci && npm run build ထားပါ။');
  process.exit(1);
}

if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      next();
      return;
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('----------------------------------------------');
  console.log(`BKK Website Server started on port ${PORT}`);
  console.log(`Environment : ${NODE_ENV}`);
  console.log(`Data file   : ${DATA_FILE}`);
  console.log(`Upload dir  : ${UPLOAD_DIR}`);
  console.log(`Admin user  : ${ADMIN_USERNAME}`);
  console.log('----------------------------------------------');
});

function shutdown(signal) {
  console.log(`${signal} ရရှိလို့ Server ကိုပိတ်နေပါတယ်...`);
  server.close(() => process.exit(0));

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

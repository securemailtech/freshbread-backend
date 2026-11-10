const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'freshbread.db');

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('Database connection error:', err);
    });
  }
  return db;
}

// Helper: run SQL and WAIT until finished
function runAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper: get all rows
function allAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ==========================================
// AUTO-BACKUP (PROTECTED - empty DB never overwrites Cloudinary)
// ==========================================
async function backupDatabaseToCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary keys not found, skipping backup.');
    return;
  }

  try {
    const database = getDb();
    const content = await allAsync(database, "SELECT * FROM site_content");
    const orders  = await allAsync(database, "SELECT * FROM orders");
    const images  = await allAsync(database, "SELECT * FROM site_images");
    const blogs   = await allAsync(database, "SELECT * FROM blogs");

    // 🔒 SAFETY LOCK — empty database Cloudinary ko kabhi overwrite nahi karega
    if ((blogs || []).length === 0 && (orders || []).length === 0) {
      console.log('⚠️ SKIPPING backup: local DB is empty. Cloudinary 8.76MB backup is SAFE.');
      return;
    }

    const backupObj = {
      content,
      orders,
      images,
      blogs,
      timestamp: new Date().toISOString()
    };

    const base64Data = `data:text/plain;base64,${Buffer.from(JSON.stringify(backupObj)).toString('base64')}`;

    await cloudinary.uploader.upload(base64Data, {
      resource_type: 'raw',
      public_id: 'freshbread_data_backup.json',
      overwrite: true,
      invalidate: true
    });

    console.log(`☁️ Cloudinary Backup SUCCESS! (${orders.length} orders, ${blogs.length} blogs)`);
  } catch (err) {
    console.error('DB Backup warning:', err.message);
  }
}

// ==========================================
// AUTO-RESTORE FROM CLOUDINARY (SAFE + SEQUENTIAL)
// ==========================================
async function restoreDatabaseFromCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;

  const backupUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/freshbread_data_backup.json?t=${Date.now()}`;

  return new Promise((resolve) => {
    console.log('🔄 Downloading backup from Cloudinary...');

    https.get(backupUrl, (res) => {
      let raw = '';

      if (res.statusCode !== 200) {
        console.log('No Cloudinary backup found (status ' + res.statusCode + ')');
        return resolve(false);
      }

      res.on('data', chunk => raw += chunk);

      res.on('end', async () => {
        try {
          const parsed = JSON.parse(raw);
          const database = getDb();

          const blogCount  = (parsed.blogs  || []).length;
          const orderCount = (parsed.orders || []).length;

          console.log(`📦 Backup parsed: ${blogCount} blogs, ${orderCount} orders, ${(parsed.content || []).length} content rows`);

          // ---- 1. Content ----
          for (const c of (parsed.content || [])) {
            try {
              await runAsync(
                database,
                `INSERT OR REPLACE INTO site_content (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
                [c.id, c.key, c.value, c.updated_at || new Date().toISOString()]
              );
            } catch (e) { /* skip bad row */ }
          }

          // ---- 2. Orders ----
          for (const o of (parsed.orders || [])) {
            try {
              await runAsync(
                database,
                `INSERT OR REPLACE INTO orders
                 (id, customer_name, customer_phone, customer_email, items, total, status, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  o.id,
                  o.customer_name || 'Customer',
                  o.customer_phone || '',
                  o.customer_email || '',
                  o.items || '',
                  o.total || 0,
                  o.status || 'pending',
                  o.notes || '',
                  o.created_at || new Date().toISOString(),
                  o.updated_at || new Date().toISOString()
                ]
              );
            } catch (e) { /* skip bad row */ }
          }

          // ---- 3. Images ----
          for (const img of (parsed.images || [])) {
            try {
              await runAsync(
                database,
                `INSERT OR REPLACE INTO site_images (id, key, filename, url, updated_at) VALUES (?, ?, ?, ?, ?)`,
                [img.id, img.key, img.filename || '', img.url || '', img.updated_at || new Date().toISOString()]
              );
            } catch (e) { /* skip bad row */ }
          }

          // ---- 4. Blogs (most important) ----
          let restoredBlogs = 0;
          for (const b of (parsed.blogs || [])) {
            try {
              const slug = (b.slug && b.slug.trim()) ? b.slug.trim() : `blog-${b.id || restoredBlogs + 1}`;

              await runAsync(
                database,
                `INSERT OR REPLACE INTO blogs (
                  id, title, slug, excerpt, content, image_url,
                  quick_answer, sources, cta,
                  meta_title, meta_description, schema_code,
                  status, published_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  b.id,
                  b.title || 'Untitled',
                  slug,
                  b.excerpt || '',
                  b.content || '',
                  b.image_url || '',
                  b.quick_answer || '',
                  b.sources || '',
                  b.cta || '',
                  b.meta_title || '',
                  b.meta_description || '',
                  b.schema_code || '',
                  b.status || 'published',
                  b.published_at || b.created_at || new Date().toISOString(),
                  b.created_at || new Date().toISOString(),
                  b.updated_at || new Date().toISOString()
                ]
              );
              restoredBlogs++;
            } catch (e) {
              console.error('Blog restore skip:', e.message);
            }
          }

          console.log(`✅ RESTORE COMPLETE → ${restoredBlogs} blogs, ${orderCount} orders restored into SQLite`);
          resolve(true);
        } catch (err) {
          console.error('❌ Restore failed:', err.message);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error('Cloudinary download error:', err.message);
      resolve(false);
    });
  });
}

// ==========================================
// INITIALIZE DATABASE
// ==========================================
async function initializeDatabase() {
  const database = getDb();

  // 1. Create all tables (wait until finished)
  await new Promise((resolve) => {
    database.serialize(() => {
      database.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS site_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS site_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        quick_answer TEXT,
        sources TEXT,
        cta TEXT,
        meta_title TEXT,
        meta_description TEXT,
        schema_code TEXT,
        status TEXT DEFAULT 'published',
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, () => resolve());
    });
  });

  // 2. Migrations — WAIT for each one (no race condition)
  const migrations = [
    `ALTER TABLE blogs ADD COLUMN quick_answer TEXT`,
    `ALTER TABLE blogs ADD COLUMN sources TEXT`,
    `ALTER TABLE blogs ADD COLUMN cta TEXT`,
    `ALTER TABLE blogs ADD COLUMN meta_title TEXT`,
    `ALTER TABLE blogs ADD COLUMN meta_description TEXT`,
    `ALTER TABLE blogs ADD COLUMN schema_code TEXT`,
    `ALTER TABLE blogs ADD COLUMN published_at DATETIME`
  ];

  for (const sql of migrations) {
    try {
      await runAsync(database, sql);
    } catch (e) {
      // column already exists → ignore
    }
  }
  console.log('✅ All blog columns ready (including published_at)');

  // 3. Default content (only if missing)
  const defaultContent = [
    ['hero_title', 'Señorita'],
    ['hero_subtitle', 'Made Fresh Daily'],
    ['hero_description', 'Our mission is to craft the best-tasting bread...'],
    ['special_label', 'Special of the Day'],
    ['special_discount', '20% OFF'],
    ['special_text', 'TODAY'],
    ['product_name', 'Señorita Bread'],
    ['product_description', 'Our signature soft, sweet bread...'],
    ['business_hours', 'Tues–Sun: 6AM–6PM<br>Mon: Closed'],
    ['phone', '(209) 420-7925'],
    ['email', 'freshhotbread@gmail.com'],
    ['location', '2233 Grand Canal Blvd UNIT 102, Stockton, CA 95207']
  ];

  for (const [key, value] of defaultContent) {
    try {
      await runAsync(database, `INSERT OR IGNORE INTO site_content (key, value) VALUES (?, ?)`, [key, value]);
    } catch (e) {}
  }

  // 4. RESTORE FROM CLOUDINARY (tables + columns are 100% ready now)
  await restoreDatabaseFromCloudinary();

  // 5. Admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Blues@13';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  return new Promise((resolve) => {
    database.get(`SELECT id FROM admin_users WHERE username = ?`, [adminUsername], (err, row) => {
      if (row) {
        database.run(`UPDATE admin_users SET password = ? WHERE username = ?`, [hashedPassword, adminUsername], () => resolve(database));
      } else {
        database.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, [adminUsername, hashedPassword], () => resolve(database));
      }
    });
  });
}

module.exports = { initializeDatabase, getDb, backupDatabaseToCloudinary };
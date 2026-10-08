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
      if (err) {
        console.error('Database connection error:', err);
      }
    });
  }
  return db;
}

// ==========================================
// AUTO-BACKUP DATA TO CLOUDINARY (JSON FORMAT)
// ==========================================
async function backupDatabaseToCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Cloudinary keys not found, skipping backup.');
    return;
  }
  const database = getDb();
  
  try {
    const content = await new Promise((res, rej) => database.all("SELECT * FROM site_content", (e, r) => e ? rej(e) : res(r || [])));
    const orders = await new Promise((res, rej) => database.all("SELECT * FROM orders", (e, r) => e ? rej(e) : res(r || [])));
    const images = await new Promise((res, rej) => database.all("SELECT * FROM site_images", (e, r) => e ? rej(e) : res(r || [])));
    const blogs = await new Promise((res, rej) => database.all("SELECT * FROM blogs", (e, r) => e ? rej(e) : res(r || [])));

    const backupObj = { content, orders, images, blogs, timestamp: new Date().toISOString() };
    const base64Data = `data:text/plain;base64,${Buffer.from(JSON.stringify(backupObj)).toString('base64')}`;

    await cloudinary.uploader.upload(base64Data, {
      resource_type: 'raw',
      public_id: 'freshbread_data_backup.json',
      overwrite: true,
      invalidate: true
    });
    console.log(`Cloudinary Auto-Backup SUCCESS! (${orders.length} orders, ${content.length} content, ${(blogs || []).length} blogs backed up)`);
  } catch (err) {
    console.error('DB Backup warning:', err.message);
  }
}

// ==========================================
// AUTO-RESTORE DATA FROM CLOUDINARY
// ==========================================
async function restoreDatabaseFromCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  
  const backupUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/freshbread_data_backup.json?t=${Date.now()}`;
  
  return new Promise((resolve) => {
    console.log('Checking for Database JSON backup on Cloudinary...');
    https.get(backupUrl, (res) => {
      let data = '';
      if (res.statusCode === 200) {
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const database = getDb();

            database.serialize(() => {
              // Restore Content
              if (parsed.content && parsed.content.length > 0) {
                const stmt = database.prepare("INSERT OR REPLACE INTO site_content (id, key, value, updated_at) VALUES (?, ?, ?, ?)");
                parsed.content.forEach(c => stmt.run(c.id, c.key, c.value, c.updated_at || new Date().toISOString()));
                stmt.finalize();
              }
              // Restore Orders
              if (parsed.orders && parsed.orders.length > 0) {
                const stmt = database.prepare("INSERT OR REPLACE INTO orders (id, customer_name, customer_phone, customer_email, items, total, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                parsed.orders.forEach(o => stmt.run(o.id, o.customer_name, o.customer_phone, o.customer_email || '', o.items, o.total, o.status || 'pending', o.notes || '', o.created_at || new Date().toISOString(), o.updated_at || new Date().toISOString()));
                stmt.finalize();
              }
              // Restore Images
              if (parsed.images && parsed.images.length > 0) {
                const stmt = database.prepare("INSERT OR REPLACE INTO site_images (id, key, filename, url, updated_at) VALUES (?, ?, ?, ?, ?)");
                parsed.images.forEach(img => stmt.run(img.id, img.key, img.filename, img.url, img.updated_at || new Date().toISOString()));
                stmt.finalize();
              }
              // Restore Blogs
              if (parsed.blogs && parsed.blogs.length > 0) {
                const stmt = database.prepare("INSERT OR REPLACE INTO blogs (id, title, slug, excerpt, content, image_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                parsed.blogs.forEach(b => stmt.run(b.id, b.title, b.slug, b.excerpt || '', b.content, b.image_url || '', b.status || 'published', b.created_at || new Date().toISOString(), b.updated_at || new Date().toISOString()));
                stmt.finalize();
              }
            });
            console.log(`SQLite Database restored from Cloudinary! (${parsed.orders ? parsed.orders.length : 0} orders, ${parsed.blogs ? parsed.blogs.length : 0} blogs loaded)`);
            resolve(true);
          } catch (e) {
            console.log('Failed to parse backup JSON:', e.message);
            resolve(false);
          }
        });
      } else {
        console.log('No existing Cloudinary JSON backup found, starting with default DB.');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('Could not fetch backup from Cloudinary:', err.message);
      resolve(false);
    });
  });
}

// ==========================================
// INITIALIZE DATABASE TABLES & DEFAULT DATA
// ==========================================
async function initializeDatabase() {
  const database = getDb();

  // 1. Create Tables First
  await new Promise((resolve, reject) => {
    database.serialize(() => {
      // (Baki tables admin_users, site_content, site_images, orders waise hi rahenge)
      database.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS site_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL, value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS site_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL, filename TEXT NOT NULL, url TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
          customer_email TEXT, items TEXT NOT NULL, total REAL NOT NULL,
          status TEXT DEFAULT 'pending', notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // NEW UPDATED BLOGS TABLE
      database.run(`
        CREATE TABLE IF NOT EXISTS blogs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          excerpt TEXT,
          content TEXT NOT NULL,
          image_url TEXT,
          quick_answer TEXT,
          sources TEXT,
          status TEXT DEFAULT 'published',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (!err) {
          // AUTO MIGRATION: Add columns if they don't exist in older DB
          database.run(`ALTER TABLE blogs ADD COLUMN quick_answer TEXT`, () => {});
          database.run(`ALTER TABLE blogs ADD COLUMN sources TEXT`, () => {});
          console.log('Blogs table ready and updated');
        }
      });

      // Default Content Insertion... (Tumhara purana code)
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

      const insertContent = database.prepare(`INSERT OR IGNORE INTO site_content (key, value) VALUES (?, ?)`);
      defaultContent.forEach(([key, value]) => insertContent.run(key, value));
      insertContent.finalize(() => resolve());
    });
  });

  // 2. Restore data from Cloudinary (if available)
  await restoreDatabaseFromCloudinary();

  // 3. Default Admin User Creation
  return new Promise((resolve) => {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Blues@13';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

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
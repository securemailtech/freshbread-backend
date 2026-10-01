# 🍞 Fresh Hot Bread - Complete Backend Package

## ✅ ALL FILES INCLUDED - Ready to Run!

This package contains EVERYTHING you need - all JavaScript files, configuration, and documentation.

## 📦 What's Included

```
backend-complete/
├── package.json              ✅ All dependencies listed
├── .env                      ✅ Configuration file
├── .gitignore               ✅ Git ignore rules
├── server.js                ✅ Main Express server
│
├── config/
│   └── database.js          ✅ SQLite connection
│
├── middleware/
│   ├── auth.js              ✅ JWT authentication
│   └── upload.js            ✅ File upload handling
│
├── models/
│   └── initDb.js            ✅ Database initialization
│
├── routes/
│   ├── auth.js              ✅ Auth routes
│   ├── content.js           ✅ Content routes
│   └── images.js            ✅ Image routes
│
├── controllers/
│   ├── authController.js    ✅ Auth logic
│   ├── contentController.js ✅ Content logic
│   └── imageController.js   ✅ Image logic
│
├── admin-dashboard/
│   ├── index.html           ✅ Login page
│   ├── dashboard.html       ✅ Admin interface
│   ├── styles.css           ✅ Styles
│   └── script.js            ✅ Dashboard JS
│
├── database/                ✅ (auto-created on first run)
├── uploads/images/          ✅ (for uploaded images)
└── README.md                ✅ This file
```

## 🚀 QUICK START (3 Steps)

### Step 1: Install Dependencies

```bash
cd backend-complete
npm install
```

This will install:
- express (web server)
- sqlite3 (database)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- dotenv (environment variables)
- cors (cross-origin requests)
- multer (file uploads)
- express-validator (input validation)
- nodemon (development server)

### Step 2: Start the Server

```bash
npm run dev
```

You should see:
```
✅ Connected to SQLite database
✅ Database initialized successfully
✅ Default admin user created
🍞 Fresh Bread API running on port 5000
📊 Admin Dashboard: http://localhost:5000/admin
🔧 Environment: development
```

### Step 3: Access Admin Dashboard

Open your browser: **http://localhost:5000/admin**

Login with:
- Username: `admin`
- Password: `FreshBread2025!`

**⚠️ IMPORTANT: Change this password immediately after logging in!**

## ✅ Verify Everything Works

### Test 1: Check Server is Running
Open: http://localhost:5000/api/health

You should see:
```json
{
  "status": "ok",
  "message": "Fresh Bread API is running",
  "timestamp": "2025-12-09T..."
}
```

### Test 2: Check Content API
Open: http://localhost:5000/api/content

You should see all default content:
```json
{
  "success": true,
  "content": {
    "hero_title": "Senorita Bread",
    "hero_subtitle": "Made Fresh Daily",
    ...
  }
}
```

### Test 3: Login to Dashboard
1. Go to: http://localhost:5000/admin
2. Login with admin/FreshBread2025!
3. You should see the dashboard with 5 sections

### Test 4: Update Content
1. In dashboard, change "Hero Title" to "Fresh Bread"
2. Click "Save All Changes"
3. You should see: "✓ All changes saved successfully!"
4. Open http://localhost:5000/api/content
5. Verify hero_title is now "Fresh Bread"

## 🔗 Connect to Your Frontend

Add this to the TOP of your `main-backup.js`:

```javascript
// ========== API CONFIGURATION ==========
const API_URL = 'http://localhost:5000';

// ========== LOAD DYNAMIC CONTENT ==========
async function loadDynamicContent() {
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const data = await response.json();
    
    if (data.success) {
      const content = data.content;
      
      // Update hero title
      const heroTitle = document.querySelector('.hero h1');
      if (heroTitle && content.hero_title) {
        heroTitle.innerHTML = content.hero_title + '<br><span class="highlight">Bread</span>';
      }
      
      // Update hero subtitle
      const heroSubtitle = document.querySelector('.hero-subtitle');
      if (heroSubtitle && content.hero_subtitle) {
        heroSubtitle.textContent = content.hero_subtitle;
      }
      
      // Update hero description
      const heroDescription = document.querySelector('.hero-description');
      if (heroDescription && content.hero_description) {
        heroDescription.textContent = content.hero_description;
      }
      
      // Update special badge
      const specialLabel = document.querySelector('.special-label');
      if (specialLabel && content.special_label) {
        specialLabel.textContent = content.special_label;
      }
      
      const specialDiscount = document.querySelector('.special-discount');
      if (specialDiscount && content.special_discount) {
        specialDiscount.textContent = content.special_discount;
      }
      
      const specialToday = document.querySelector('.special-today');
      if (specialToday && content.special_text) {
        specialToday.textContent = content.special_text;
      }
      
      // Update product info
      const productName = document.querySelector('.product-header h3');
      if (productName && content.product_name) {
        productName.textContent = content.product_name;
      }
      
      const productDesc = document.querySelector('.product-desc');
      if (productDesc && content.product_description) {
        productDesc.textContent = content.product_description;
      }
      
      console.log('✅ Dynamic content loaded successfully');
    }
  } catch (error) {
    console.error('❌ Error loading dynamic content:', error);
  }
}

// Then in your DOMContentLoaded, add:
document.addEventListener('DOMContentLoaded', function() {
  // Load dynamic content first
  loadDynamicContent();
  
  // ... rest of your existing code
});
```

## 📡 API Endpoints

### Public (No Authentication)
```
GET  /api/health              - Check if server is running
GET  /api/content             - Get all content
GET  /api/content/:key        - Get specific content
GET  /api/images              - Get all images
```

### Protected (Requires JWT Token)
```
POST /api/auth/login          - Admin login
GET  /api/auth/verify         - Verify token
POST /api/auth/change-password - Change password
POST /api/content             - Update content
POST /api/content/batch       - Batch update
POST /api/images/upload       - Upload image
DELETE /api/images/:key       - Delete image
```

## 🔐 Security Checklist

Before going live:
- [ ] Change admin password (in dashboard)
- [ ] Update JWT_SECRET in .env (use 32+ random characters)
- [ ] Update FRONTEND_URL in .env to your actual domain
- [ ] Enable HTTPS in production
- [ ] Set up automatic database backups
- [ ] Review and restrict CORS settings

## 🐛 Troubleshooting

### Problem: "Cannot find module 'express'"
**Solution:** Run `npm install`

### Problem: "Port 5000 already in use"
**Solution:** 
```bash
# Find process using port 5000
lsof -i :5000
# Kill it
kill -9 <PID>
# Or use different port in .env
PORT=3001
```

### Problem: "ENOENT: no such file or directory"
**Solution:** Make sure you're in the backend-complete directory:
```bash
cd backend-complete
npm run dev
```

### Problem: "Cannot read property 'textContent' of null"
**Solution:** Check that your HTML class names match the ones in the loadDynamicContent function

### Problem: CORS errors in browser
**Solution:** Update FRONTEND_URL in .env to match where your frontend is served from

### Problem: Database locked
**Solution:**
```bash
rm database/freshbread.db-journal
npm run dev
```

## 📊 Database Structure

### Tables:
1. **admin_users** - Admin login credentials
2. **site_content** - All website content (key-value pairs)
3. **site_images** - Uploaded images metadata

### View Database:
```bash
sqlite3 database/freshbread.db
.tables
SELECT * FROM site_content;
.exit
```

## 💾 Backup

### Backup Database:
```bash
cp database/freshbread.db database/backup-$(date +%Y%m%d).db
```

### Backup Images:
```bash
tar -czf uploads-backup.tar.gz uploads/
```

## 🚀 Production Deployment

### 1. Update Environment Variables
```env
NODE_ENV=production
JWT_SECRET=<strong-random-32+-character-string>
FRONTEND_URL=https://yourdomain.com
```

### 2. Install PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name "freshbread-api"
pm2 save
pm2 startup
```

### 3. Set Up Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Enable HTTPS
```bash
sudo certbot --nginx -d api.yourdomain.com
```

## 📝 Content Keys Available

You can manage these in the admin dashboard:

- `hero_title` - Main hero title
- `hero_subtitle` - Hero subtitle
- `hero_description` - Hero description paragraph
- `special_label` - Special offer label
- `special_discount` - Discount amount
- `special_text` - Special additional text
- `product_name` - Product name
- `product_description` - Product description
- `business_hours` - Business hours
- `phone` - Phone number
- `email` - Email address
- `location` - Location text

## 🎓 npm Commands

```bash
npm start        # Start production server
npm run dev      # Start development server (auto-reload)
npm install      # Install all dependencies
npm update       # Update dependencies
npm audit fix    # Fix security vulnerabilities
```

## 📞 Support

If you're still having issues:

1. Check that ALL files are present (see file list at top)
2. Make sure you ran `npm install`
3. Check the console output for specific error messages
4. Verify you're in the correct directory
5. Try deleting node_modules and running `npm install` again

## ✅ Success Checklist

- [ ] npm install completed without errors
- [ ] npm run dev starts server successfully
- [ ] Can access http://localhost:5000/api/health
- [ ] Can access http://localhost:5000/api/content
- [ ] Can login to http://localhost:5000/admin
- [ ] Can update content in dashboard
- [ ] Content changes are saved
- [ ] Frontend loads dynamic content

## 🎉 You're Done!

Once you see all the checkmarks above, your backend is fully operational!

Next steps:
1. Connect your frontend
2. Test all functionality
3. Change admin password
4. Plan your production deployment

---

**All files are included and ready to run. Just `npm install` and `npm run dev`!** 🍞

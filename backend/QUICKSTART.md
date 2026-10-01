# 🚀 QUICK START GUIDE

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Start the Server

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

## Step 3: Access Admin Dashboard

1. Open browser: `http://localhost:5000/admin`
2. Login with:
   - Username: `admin`
   - Password: `FreshBread2025!`

## Step 4: Update Content

1. Navigate through sections using the sidebar
2. Edit any fields
3. Click "Save All Changes" button
4. Changes are saved to the database!

## Step 5: Connect to Your Frontend

Add this to the top of your `main-backup.js`:

```javascript
// API Configuration
const API_URL = 'http://localhost:5000';

// Load dynamic content from backend
async function loadDynamicContent() {
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const data = await response.json();
    
    if (data.success) {
      const content = data.content;
      
      // Example: Update hero title
      const heroTitle = document.querySelector('.hero h1');
      if (heroTitle) {
        heroTitle.innerHTML = content.hero_title + '<br><span class="highlight">Bread</span>';
      }
      
      // Add more updates as needed...
    }
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
  loadDynamicContent();
  // ... rest of your code
});
```

## Step 6: Test the API

Open browser console and try:

```javascript
// Get all content
fetch('http://localhost:5000/api/content')
  .then(r => r.json())
  .then(d => console.log(d));

// Get specific content
fetch('http://localhost:5000/api/content/hero_title')
  .then(r => r.json())
  .then(d => console.log(d));
```

## 🎉 Done!

Your backend is now running and connected to your frontend!

## Common Commands

```bash
# Start development server (auto-reload)
npm run dev

# Start production server
npm start

# Stop server
Ctrl + C

# View database
sqlite3 database/freshbread.db
```

## API Endpoints You Can Use

**Public (No Auth):**
- `GET /api/content` - Get all content
- `GET /api/content/:key` - Get specific content
- `GET /api/images` - Get all images

**Protected (Need JWT Token):**
- `POST /api/content` - Update content
- `POST /api/content/batch` - Batch update
- `POST /api/images/upload` - Upload image

## Default Content Keys

- `hero_title`
- `hero_subtitle`
- `hero_description`
- `special_label`
- `special_discount`
- `special_text`
- `product_name`
- `product_description`
- `business_hours`
- `phone`
- `email`
- `location`

## Need Help?

Check the full README.md for detailed documentation!

# 🚀 INSTALLATION GUIDE

## Step-by-Step Installation Checklist

Follow these steps IN ORDER. Check off each step as you complete it.

### ✅ Step 1: Verify Files

Make sure you have ALL these files:

```
backend-complete/
├── [ ] package.json
├── [ ] .env
├── [ ] .gitignore
├── [ ] server.js
├── [ ] README.md
│
├── config/
│   └── [ ] database.js
│
├── middleware/
│   ├── [ ] auth.js
│   └── [ ] upload.js
│
├── models/
│   └── [ ] initDb.js
│
├── routes/
│   ├── [ ] auth.js
│   ├── [ ] content.js
│   └── [ ] images.js
│
├── controllers/
│   ├── [ ] authController.js
│   ├── [ ] contentController.js
│   └── [ ] imageController.js
│
├── admin-dashboard/
│   ├── [ ] index.html
│   ├── [ ] dashboard.html
│   ├── [ ] styles.css
│   └── [ ] script.js
│
└── uploads/images/
    └── [ ] .gitkeep
```

**Total: 19 files (not counting directories)**

### ✅ Step 2: Open Terminal

1. Open your terminal/command prompt
2. Navigate to the backend-complete folder:

```bash
cd path/to/backend-complete
```

Verify you're in the right place:
```bash
ls
```

You should see: package.json, server.js, .env, etc.

### ✅ Step 3: Install Node.js (if needed)

Check if Node.js is installed:
```bash
node --version
```

You should see: `v18.x.x` or higher

If not installed:
- **Mac**: `brew install node`
- **Windows**: Download from https://nodejs.org
- **Linux**: `sudo apt install nodejs npm`

### ✅ Step 4: Install Dependencies

Run this command:
```bash
npm install
```

This will take 1-2 minutes. You should see:
```
added 150+ packages
```

**If you get an error:**
- Make sure you're in the backend-complete directory
- Make sure package.json exists
- Try: `npm cache clean --force` then `npm install` again

### ✅ Step 5: Start the Server

Run this command:
```bash
npm run dev
```

**SUCCESS looks like this:**
```
✅ Connected to SQLite database
✅ Database initialized successfully
✅ Default admin user created
🍞 Fresh Bread API running on port 5000
📊 Admin Dashboard: http://localhost:5000/admin
🔧 Environment: development
```

**If you get an error:**
- Port 5000 in use? Change PORT in .env to 3001
- Missing module? Run `npm install` again
- See troubleshooting section below

### ✅ Step 6: Test the API

**Test 1: Health Check**

Open browser: http://localhost:5000/api/health

Should show:
```json
{
  "status": "ok",
  "message": "Fresh Bread API is running"
}
```

**Test 2: Content API**

Open browser: http://localhost:5000/api/content

Should show:
```json
{
  "success": true,
  "content": {
    "hero_title": "Senorita Bread",
    ...
  }
}
```

### ✅ Step 7: Login to Admin Dashboard

1. Open browser: http://localhost:5000/admin
2. You should see a login page
3. Enter:
   - Username: `admin`
   - Password: `FreshBread2025!`
4. Click "Sign In"
5. You should see the dashboard with 5 sections:
   - Hero Section
   - Special Offer
   - Product Info
   - Contact Details
   - Images

### ✅ Step 8: Test Content Update

1. In dashboard, click "Hero Section"
2. Change "Main Title" to "Fresh Bread Test"
3. Click "Save All Changes" (green button top right)
4. You should see: "✓ All changes saved successfully!"
5. Open new tab: http://localhost:5000/api/content
6. Verify "hero_title" is now "Fresh Bread Test"
7. ✅ IT WORKS!

### ✅ Step 9: Change Admin Password

1. In dashboard, click "Change Password" button (bottom left)
2. Enter:
   - Current Password: `FreshBread2025!`
   - New Password: (your strong password)
   - Confirm: (same password)
3. Click "Update Password"
4. ✅ Password changed!

### ✅ Step 10: Connect to Frontend

See README.md section "Connect to Your Frontend" for detailed instructions.

Quick version:
1. Add API_URL to top of main-backup.js
2. Add loadDynamicContent function
3. Call it in DOMContentLoaded
4. Refresh your website
5. See dynamic content!

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module 'express'"

**Cause:** Dependencies not installed

**Solution:**
```bash
npm install
```

### Issue 2: "Error: listen EADDRINUSE: address already in use :::5000"

**Cause:** Port 5000 is already being used

**Solution 1 - Use different port:**
Edit `.env` file, change:
```
PORT=3001
```

**Solution 2 - Kill process on port 5000:**
```bash
# Mac/Linux
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue 3: "Error: Cannot find module './config/database'"

**Cause:** File is missing or you're in wrong directory

**Solution:**
1. Verify you're in backend-complete directory
2. Run `ls` and make sure you see server.js
3. Check that config/database.js exists
4. If missing, re-download all files

### Issue 4: npm not found

**Cause:** Node.js not installed

**Solution:** Install Node.js from https://nodejs.org

### Issue 5: Permission denied on Mac/Linux

**Cause:** Need admin rights

**Solution:**
```bash
sudo npm install
```

### Issue 6: "Cannot read properties of undefined"

**Cause:** Environment variables not loaded

**Solution:**
1. Check .env file exists
2. Make sure it starts with PORT=5000
3. Restart server: `npm run dev`

### Issue 7: Login doesn't work

**Cause:** Multiple possible causes

**Solutions:**
1. Check console for errors (F12 in browser)
2. Verify server is running
3. Try default credentials: admin / FreshBread2025!
4. Check JWT_SECRET is set in .env
5. Clear browser cache

### Issue 8: Changes not saving

**Cause:** Authentication issue

**Solutions:**
1. Check browser console for errors
2. Verify you're logged in
3. Try logging out and back in
4. Check JWT_SECRET in .env

---

## 📞 Still Having Issues?

1. **Check all files are present** (use checklist above)
2. **Read the error message carefully**
3. **Check the terminal output** for specific errors
4. **Try these commands:**
   ```bash
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Try running without nodemon
   node server.js
   ```

5. **Verify Node.js version:**
   ```bash
   node --version
   # Should be v16+ or higher
   ```

---

## ✅ Installation Success Checklist

Check ALL boxes before moving forward:

- [ ] All 19 files are present
- [ ] npm install completed successfully
- [ ] npm run dev starts without errors
- [ ] Can access http://localhost:5000/api/health
- [ ] Can access http://localhost:5000/api/content
- [ ] Can login at http://localhost:5000/admin
- [ ] Can update content and see "✓ saved successfully"
- [ ] Changes appear in API at /api/content
- [ ] Changed admin password
- [ ] Understand how to connect to frontend

## 🎉 Next Steps

Once all checkboxes are checked:

1. ✅ Your backend is FULLY WORKING
2. 📱 Connect your frontend (see README.md)
3. 🧪 Test everything thoroughly
4. 🚀 Deploy to production (when ready)

---

**If you checked all boxes above, YOU'RE DONE! Your backend is ready!** 🍞

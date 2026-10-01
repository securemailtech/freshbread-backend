# 🔗 FRONTEND INTEGRATION GUIDE

This guide shows you **exactly where** to add API calls in your existing frontend to make it dynamic.

## ⚡ Quick Integration (5 Minutes)

### Step 1: Add API Configuration

Add this at the **very top** of your `main-backup.js` file (line 1):

```javascript
// ========== API CONFIGURATION ==========
const API_URL = 'http://localhost:5000'; // Change to your backend URL in production
```

### Step 2: Add Dynamic Content Loading Function

Add this function **after the API configuration** but **before** `document.addEventListener("DOMContentLoaded"`:

```javascript
// ========== DYNAMIC CONTENT LOADING ==========
async function loadDynamicContent() {
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const data = await response.json();
    
    if (data.success) {
      const content = data.content;
      
      // Update Hero Section
      const heroTitle = document.querySelector('.hero h1');
      if (heroTitle && content.hero_title) {
        heroTitle.innerHTML = content.hero_title + '<br><span class="highlight">Bread</span>';
      }
      
      const heroSubtitle = document.querySelector('.hero-subtitle');
      if (heroSubtitle && content.hero_subtitle) {
        heroSubtitle.textContent = content.hero_subtitle;
      }
      
      const heroDescription = document.querySelector('.hero-description');
      if (heroDescription && content.hero_description) {
        heroDescription.textContent = content.hero_description;
      }
      
      // Update Special Badge
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
      
      // Update Product Section
      const productName = document.querySelector('.product-header h3');
      if (productName && content.product_name) {
        productName.textContent = content.product_name;
      }
      
      const productDesc = document.querySelector('.product-desc');
      if (productDesc && content.product_description) {
        productDesc.textContent = content.product_description;
      }
      
      // Update Contact Section - Phone
      const contactCards = document.querySelectorAll('.contact-card');
      contactCards.forEach(card => {
        const phoneLink = card.querySelector('a[href^="tel:"]');
        if (phoneLink && content.phone) {
          phoneLink.textContent = content.phone;
          phoneLink.href = `tel:${content.phone.replace(/[^0-9]/g, '')}`;
        }
        
        // Update Contact Section - Email
        const emailLink = card.querySelector('a[href^="mailto:"]');
        if (emailLink && content.email) {
          emailLink.textContent = content.email;
          emailLink.href = `mailto:${content.email}`;
        }
      });
      
      // Update Business Hours
      const hoursCard = Array.from(contactCards).find(card => 
        card.querySelector('h3')?.textContent === 'Hours'
      );
      if (hoursCard && content.business_hours) {
        const hoursP = hoursCard.querySelector('p');
        if (hoursP) {
          hoursP.innerHTML = content.business_hours;
        }
      }
      
      // Update Location
      const locationCard = Array.from(contactCards).find(card => 
        card.querySelector('h3')?.textContent === 'Location'
      );
      if (locationCard && content.location) {
        const locationP = locationCard.querySelector('p');
        if (locationP) {
          locationP.innerHTML = content.location;
        }
      }
      
      console.log('✅ Dynamic content loaded successfully');
    }
  } catch (error) {
    console.error('❌ Error loading dynamic content:', error);
    console.log('⚠️ Using static content as fallback');
    // Site will continue to work with static HTML content
  }
}
```

### Step 3: Call the Function on Page Load

Find this line in your `main-backup.js`:

```javascript
document.addEventListener("DOMContentLoaded", function() {
```

Add `loadDynamicContent();` right after it:

```javascript
document.addEventListener("DOMContentLoaded", function() {
  
  // Load dynamic content from backend
  loadDynamicContent();
  
  // ========== PAGE LOADER ==========
  const pageLoader = document.getElementById('page-loader');
  // ... rest of your existing code
```

### Step 4: Test It!

1. Start your backend:
```bash
cd backend
npm run dev
```

2. Open your website
3. Open browser console (F12)
4. You should see: `✅ Dynamic content loaded successfully`
5. Go to admin dashboard and change some content
6. Refresh your website - see the changes!

## 📍 Exact Line Numbers (For Reference)

If your `main-backup.js` follows the standard structure:

| Line | What to Add |
|------|-------------|
| 1 | Add API_URL constant |
| 3-100 | Add loadDynamicContent() function |
| ~102 | Inside DOMContentLoaded, add loadDynamicContent() call |

## 🎯 What Gets Updated Dynamically

When admin changes content in the dashboard, these update automatically:

### Hero Section
- ✅ Main title ("Senorita Bread")
- ✅ Subtitle ("Made Fresh Daily")
- ✅ Description paragraph

### Special Badge
- ✅ Label ("Special of the Day")
- ✅ Discount ("20% OFF")
- ✅ Text ("TODAY")

### Product Section
- ✅ Product name
- ✅ Product description

### Contact Section
- ✅ Phone number
- ✅ Email address
- ✅ Business hours
- ✅ Location

## 🖼️ Image Updates (Optional)

To make images dynamic, you'll need to update image sources. Add this to your `loadDynamicContent()` function:

```javascript
// Load dynamic images
async function loadDynamicImages() {
  try {
    const response = await fetch(`${API_URL}/api/images`);
    const data = await response.json();
    
    if (data.success && data.images) {
      data.images.forEach(image => {
        // Update hero image
        if (image.key === 'hero_image') {
          const heroImg = document.querySelector('.hero-image-wrapper img');
          if (heroImg) {
            heroImg.src = `${API_URL}${image.url}`;
          }
        }
        
        // Update logo
        if (image.key === 'logo_image') {
          const logos = document.querySelectorAll('.logo img, .footer-logo');
          logos.forEach(logo => {
            logo.src = `${API_URL}${image.url}`;
          });
        }
        
        // Update product image
        if (image.key === 'product_image') {
          const productImg = document.querySelector('.product-image img');
          if (productImg) {
            productImg.src = `${API_URL}${image.url}`;
          }
        }
      });
    }
  } catch (error) {
    console.error('Error loading images:', error);
  }
}

// Call it alongside content loading
loadDynamicContent();
loadDynamicImages();
```

## 🔄 CORS Configuration

If you get CORS errors, update your backend `.env` file:

```env
FRONTEND_URL=http://localhost:3000
```

Or if serving from a different port/domain:

```env
FRONTEND_URL=https://yourwebsite.com
```

## 🚀 Production Setup

When deploying to production:

1. **Update API_URL** in your frontend:
```javascript
const API_URL = 'https://api.yourwebsite.com';
```

2. **Update FRONTEND_URL** in backend `.env`:
```env
FRONTEND_URL=https://yourwebsite.com
```

3. Make sure both are using HTTPS in production!

## ✅ Testing Checklist

Test each section after integration:

- [ ] Hero title changes when updated in admin
- [ ] Hero subtitle changes when updated in admin
- [ ] Hero description changes when updated in admin
- [ ] Special badge updates (all 3 fields)
- [ ] Product name updates
- [ ] Product description updates
- [ ] Phone number updates
- [ ] Email updates
- [ ] Business hours update
- [ ] Location updates

## 🐛 Troubleshooting

### Issue: "ERR_CONNECTION_REFUSED"
**Solution:** Make sure backend is running on port 5000

### Issue: CORS Error
**Solution:** Update `FRONTEND_URL` in backend `.env`

### Issue: Content not updating
**Solution:** 
1. Check browser console for errors
2. Verify API_URL is correct
3. Make sure backend is running
4. Try hard refresh (Ctrl+Shift+R)

### Issue: "Cannot read property 'textContent'"
**Solution:** HTML element selectors might be wrong. Check that class names match your HTML.

## 📦 Complete Integration Example

Here's the complete top section of `main-backup.js` after integration:

```javascript
// ========== API CONFIGURATION ==========
const API_URL = 'http://localhost:5000';

// ========== DYNAMIC CONTENT LOADING ==========
async function loadDynamicContent() {
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const data = await response.json();
    
    if (data.success) {
      const content = data.content;
      
      // Update all content here (see full function above)
      // ...
      
      console.log('✅ Dynamic content loaded successfully');
    }
  } catch (error) {
    console.error('❌ Error loading dynamic content:', error);
  }
}

// ========== EXISTING CODE STARTS HERE ==========
document.addEventListener("DOMContentLoaded", function() {
  
  // Load dynamic content first
  loadDynamicContent();
  
  // ========== PAGE LOADER ==========
  const pageLoader = document.getElementById('page-loader');
  if (pageLoader) {
    setTimeout(function() {
      pageLoader.classList.add('loaded');
    }, 800);
  }
  
  // ... rest of your existing code continues unchanged ...
```

## 🎉 That's It!

Your website is now fully dynamic and can be managed through the admin dashboard without touching any code!

Need more help? Check the main README.md for detailed API documentation.

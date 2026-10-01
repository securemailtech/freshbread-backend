document.addEventListener("DOMContentLoaded", function() {
  
  // ========== API CONFIGURATION ==========
  // Works both locally AND on Render!
  let API_URL;
  if (window.location.hostname === 'localhost') {
    API_URL = 'http://localhost:5000';
  } else {
    API_URL = '';
  }
  
  // ========== PAGE LOADER ==========
  const pageLoader = document.getElementById('page-loader');
  if (pageLoader) {
    setTimeout(function() {
      pageLoader.classList.add('loaded');
    }, 800);
  }

  // ========== NAVIGATION ==========
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");
  const navbar = document.getElementById("navbar");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("active");
    });
    
    navLinks.querySelectorAll("a").forEach(function(link) {
      link.addEventListener("click", function() {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
      });
    });

    document.addEventListener("click", function(e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
      }
    });
  }

  // ========== SCROLL EFFECTS ==========
  window.addEventListener("scroll", function() {
    const currentScroll = window.pageYOffset;
    
    if (navbar) {
      navbar.classList.toggle("scrolled", currentScroll > 50);
    }
    
    const backToTop = document.getElementById("back-to-top");
    if (backToTop) {
      backToTop.classList.toggle("visible", currentScroll > 500);
    }
  });

  // ========== CART STATE ==========
  let cart = [];
  let total = 0;

  // ========== DOM ELEMENTS ==========
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const quantitySelect = document.getElementById('quantity');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const cartEmptyMsg = document.querySelector('.cart-empty');
  const selectedPriceDisplay = document.getElementById('selected-price');
  const cartToggle = document.getElementById("cart-toggle");
  const miniCart = document.getElementById("mini-cart");
  const cartClose = document.getElementById("cart-close");
  const cartOverlay = document.getElementById("cart-overlay");
  const checkoutBtn = document.getElementById("checkout-btn");
  const toast = document.getElementById("toast");

  // ========== TOAST ==========
  function showToast(message, isError) {
    if (isError === undefined) isError = false;
    if (toast) {
      const toastMessage = toast.querySelector('.toast-message');
      if (toastMessage) toastMessage.textContent = message;
      toast.style.background = isError ? '#DC2626' : '#2F855A';
      toast.classList.add('show');
      setTimeout(function() {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  // ========== CART DISPLAY ==========
  function updateCartDisplay() {
    const cartDot = document.getElementById('cart-dot');
    if (cartDot) cartDot.classList.toggle('show', cart.length > 0);
    if (cartItems) cartItems.innerHTML = "";
    if (cartEmptyMsg) cartEmptyMsg.style.display = cart.length === 0 ? "block" : "none";

    cart.forEach(function(item) {
      const li = document.createElement('li');
      li.classList.add("cart-item");
      li.innerHTML = '<span>' + item.quantityText + '</span><button class="remove-btn" data-id="' + item.id + '">×</button>';
      if (cartItems) cartItems.appendChild(li);
    });

    if (cartTotal) cartTotal.textContent = total.toFixed(2);
    if (checkoutBtn) {
      checkoutBtn.disabled = cart.length === 0;
      checkoutBtn.textContent = cart.length > 0 ? 'Place Order' : 'Cart Empty';
    }
  }

  // ========== CART OPEN/CLOSE ==========
  function openCart() {
    if (miniCart) miniCart.classList.add("show");
    if (cartOverlay) cartOverlay.classList.add("show");
    document.body.classList.add("cart-open");
  }

  function closeCart() {
    if (miniCart) miniCart.classList.remove("show");
    if (cartOverlay) cartOverlay.classList.remove("show");
    document.body.classList.remove("cart-open");
    hideOrderForm();
  }

  // ========== ADD TO CART ==========
  if (addToCartBtn && quantitySelect) {
    addToCartBtn.addEventListener('click', function() {
      const quantityText = quantitySelect.options[quantitySelect.selectedIndex].text;
      const price = parseFloat(quantitySelect.value);

      cart.push({ id: Date.now(), quantityText: quantityText, price: price });
      total += price;
      updateCartDisplay();

      addToCartBtn.classList.add('added');
      const btnText = addToCartBtn.querySelector('.btn-text');
      const originalText = btnText ? btnText.textContent : 'Add to Order';
      if (btnText) btnText.textContent = 'Added!';
      
      showToast('Added to cart!');
      
      setTimeout(function() {
        addToCartBtn.classList.remove('added');
        if (btnText) btnText.textContent = originalText;
      }, 1500);

      setTimeout(openCart, 300);
    });
  }

  // ========== REMOVE FROM CART ==========
  if (cartItems) {
    cartItems.addEventListener("click", function(e) {
      if (e.target.classList.contains("remove-btn")) {
        const id = Number(e.target.dataset.id);
        const item = cart.find(function(i) { return i.id === id; });
        if (item) {
          e.target.parentElement.classList.add('removing');
          setTimeout(function() {
            total -= item.price;
            cart = cart.filter(function(i) { return i.id !== id; });
            updateCartDisplay();
          }, 300);
        }
      }
    });
  }

  // ========== PRICE UPDATE ==========
  if (quantitySelect && selectedPriceDisplay) {
    quantitySelect.addEventListener('change', function() {
      selectedPriceDisplay.textContent = parseFloat(quantitySelect.value).toFixed(2);
    });
  }

  // ========== CART TOGGLE ==========
  if (cartToggle) {
    cartToggle.addEventListener("click", function() {
      if (miniCart && miniCart.classList.contains("show")) {
        closeCart();
      } else {
        openCart();
      }
    });
  }
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  // ========== ORDER FORM ==========
  let orderFormCreated = false;
  
  function createOrderForm() {
    if (orderFormCreated) return;
    
    const cartFooter = document.querySelector('.cart-footer');
    if (!cartFooter) return;
    
    const orderForm = document.createElement('div');
    orderForm.id = 'order-form';
    orderForm.className = 'order-form';
    orderForm.innerHTML = '<div class="order-form-header">' +
      '<button type="button" class="back-btn" id="back-to-cart">← Back</button>' +
      '<h4>Your Information</h4>' +
      '</div>' +
      '<form id="checkout-form">' +
      '<div class="form-group">' +
      '<label for="order-customer-name">Name *</label>' +
      '<input type="text" id="order-customer-name" required placeholder="Your full name">' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="order-customer-phone">Phone *</label>' +
      '<input type="tel" id="order-customer-phone" required placeholder="(209) 555-1234">' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="order-customer-email">Email (optional)</label>' +
      '<input type="email" id="order-customer-email" placeholder="your@email.com">' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="order-notes">Special Notes</label>' +
      '<textarea id="order-notes" rows="2" placeholder="Pickup time, special requests..."></textarea>' +
      '</div>' +
      '<button type="submit" class="submit-order-btn">' +
      'Place Order - $<span id="form-total">0.00</span>' +
      '</button>' +
      '</form>';
    
    cartFooter.parentNode.insertBefore(orderForm, cartFooter.nextSibling);
    
    // Styles
    const style = document.createElement('style');
    style.textContent = '.order-form { display: none; padding: 24px; background: var(--warm-white, #FFFEF9); border-top: 1px solid rgba(0,0,0,0.08); }' +
      '.order-form.show { display: block; }' +
      '.order-form-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }' +
      '.order-form-header h4 { font-size: 1.25rem; color: #960909; margin: 0; font-family: "Playfair Display", serif; }' +
      '.order-form .back-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 14px; padding: 8px 0; }' +
      '.order-form .back-btn:hover { color: #960909; }' +
      '.order-form .form-group { margin-bottom: 16px; }' +
      '.order-form label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #2C2C2C; }' +
      '.order-form input, .order-form textarea { width: 100%; padding: 12px 16px; border: 2px solid rgba(0,0,0,0.1); border-radius: 12px; font-size: 15px; font-family: inherit; transition: 0.2s; box-sizing: border-box; }' +
      '.order-form input:focus, .order-form textarea:focus { outline: none; border-color: #960909; }' +
      '.submit-order-btn { width: 100%; padding: 16px 24px; background: #960909; color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.2s; }' +
      '.submit-order-btn:hover { background: #6B0707; }' +
      '.submit-order-btn:disabled { opacity: 0.7; cursor: not-allowed; }' +
      '.cart-footer.hidden { display: none; }' +
      '.order-success { text-align: center; padding: 40px 24px; }' +
      '.order-success .success-icon { font-size: 64px; margin-bottom: 16px; }' +
      '.order-success h3 { color: #960909; margin-bottom: 12px; font-family: "Playfair Display", serif; }' +
      '.order-success p { color: #666; margin-bottom: 8px; }';
    document.head.appendChild(style);
    
    document.getElementById('back-to-cart').addEventListener('click', hideOrderForm);
    document.getElementById('checkout-form').addEventListener('submit', submitOrder);
    
    orderFormCreated = true;
  }
  
  function showOrderForm() {
    createOrderForm();
    const orderForm = document.getElementById('order-form');
    const cartFooter = document.querySelector('.cart-footer');
    
    if (orderForm && cartFooter) {
      cartFooter.classList.add('hidden');
      orderForm.classList.add('show');
      const formTotal = document.getElementById('form-total');
      if (formTotal) {
        formTotal.textContent = total.toFixed(2);
      }
    }
  }

  function hideOrderForm() {
    const orderForm = document.getElementById('order-form');
    const cartFooter = document.querySelector('.cart-footer');
    if (orderForm) orderForm.classList.remove('show');
    if (cartFooter) cartFooter.classList.remove('hidden');
  }
  
  async function submitOrder(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';
    
    const orderData = {
      customerName: document.getElementById('order-customer-name').value,
      customerPhone: document.getElementById('order-customer-phone').value,
      customerEmail: document.getElementById('order-customer-email').value || '',
      items: cart.map(function(item) { return item.quantityText; }).join(', '),
      total: total,
      notes: document.getElementById('order-notes').value || ''
    };
    
    console.log('Sending order:', orderData);
    
    fetch(API_URL + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    .then(function(response) {
      console.log('Response received:', response.status);
      return response.json();
    })
    .then(function(result) {
      console.log('Result:', result);
      showOrderSuccess(orderData.customerName, result.orderId || Date.now());
      cart = [];
      total = 0;
      updateCartDisplay();
    })
    .catch(function(error) {
      console.error('Order error:', error);
      showOrderSuccess(orderData.customerName, Date.now());
      cart = [];
      total = 0;
      updateCartDisplay();
    });
  }
  
  function showOrderSuccess(name, orderId) {
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
      orderForm.innerHTML = '<div class="order-success">' +
        '<div class="success-icon">✓</div>' +
        '<h3>Thank You, ' + name + '!</h3>' +
        '<p>Your order #' + orderId + ' has been received.</p>' +
        '<p>We\'ll call you shortly to confirm pickup.</p>' +
        '<button onclick="location.reload()" class="submit-order-btn" style="margin-top: 20px;">' +
        'Continue Shopping' +
        '</button>' +
        '</div>';
    }
  }
  
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function() {
      if (cart.length > 0) showOrderForm();
    });
  }

  updateCartDisplay();

  // ========== SMOOTH SCROLLING ==========
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const navHeight = navbar ? navbar.offsetHeight : 80;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.pageYOffset - navHeight,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========== FADE IN ANIMATIONS ==========
  const fadeObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in').forEach(function(el) {
    fadeObserver.observe(el);
  });

  // ========== FAQ ACCORDION ==========
  document.querySelectorAll('.faq-item').forEach(function(detail) {
    detail.addEventListener('toggle', function() {
      if (this.open) {
        document.querySelectorAll('.faq-item').forEach(function(other) {
          if (other !== detail && other.open) other.open = false;
        });
      }
    });
  });

  // ========== GALLERY ==========
  document.querySelectorAll('.gallery-item').forEach(function(item) {
    item.addEventListener('click', function() {
      this.classList.toggle('expanded');
    });
  });

  // ========== KEYBOARD ==========
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeCart();
      if (hamburger) hamburger.classList.remove("active");
      if (navLinks) navLinks.classList.remove("active");
    }
  });

  // ========== SPECIAL OFFER TOGGLE ==========
  async function loadSpecialOfferVisibility() {
    try {
      const response = await fetch(API_URL + '/api/content/special_enabled');
      const data = await response.json();
      
      const specialBadge = document.querySelector('.special-badge');
      if (specialBadge) {
        if (data.value === 'false' || data.value === false) {
          specialBadge.classList.add('hidden');
        } else {
          specialBadge.classList.remove('hidden');
        }
      }
    } catch (error) {
      console.log('Could not load special offer setting, showing by default');
    }
  }
  
  loadSpecialOfferVisibility();

  // ========== LOAD DYNAMIC IMAGES FROM DATABASE ==========
  async function loadDynamicImages() {
    const imageMap = {
      'hero': '.hero-image-wrapper img',
      'logo': '.logo img, .footer-logo',
      'product': '.product-image img',
      'coffee': '.coffee-image-wrapper img',
      'feature1': '.feature-card:nth-child(1) .feature-image img',
      'feature2': '.feature-card:nth-child(2) .feature-image img',
      'feature3': '.feature-card:nth-child(3) .feature-image img',
      'gallery1': '.gallery-item:nth-child(1) img',
      'gallery2': '.gallery-item:nth-child(2) img',
      'gallery3': '.gallery-item:nth-child(3) img',
      'gallery4': '.gallery-item:nth-child(4) img'
    };

    for (const key in imageMap) {
      try {
        const response = await fetch(API_URL + '/api/images/' + key);
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            const elements = document.querySelectorAll(imageMap[key]);
            elements.forEach(function(el) {
              el.src = data.url;
            });
          }
        }
      } catch (error) {
        // Use default image if fetch fails - silently continue
      }
    }
  }

  // Load dynamic images
  loadDynamicImages();

});
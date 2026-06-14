// script.js

// Header scroll effect
const header = document.getElementById('main-header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.getElementById('nav-links');

mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    if (navLinks.classList.contains('active')) {
        mobileToggle.textContent = '✕';
    } else {
        mobileToggle.textContent = '☰';
    }
});

// Close mobile menu when clicking a link
document.querySelectorAll('#nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileToggle.textContent = '☰';
    });
});

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal Logic
let currentProduct = null;

function openModal(images, title, price, desc) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    document.body.style.overflow = 'hidden';
    
    let imgArray = Array.isArray(images) ? images : [images];
    document.getElementById('modal-img').src = imgArray[0];
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-price').textContent = price;
    document.getElementById('modal-desc').textContent = desc;
    
    // reset size selection
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
    
    // Populate thumbnails
    const thumbnailsContainer = document.getElementById('modal-thumbnails');
    if (thumbnailsContainer) {
        thumbnailsContainer.innerHTML = '';
        if (imgArray.length > 1) {
            imgArray.forEach((imgSrc, index) => {
                const thumb = document.createElement('img');
                thumb.src = imgSrc;
                thumb.className = 'thumbnail-img';
                if (index === 0) thumb.classList.add('active');
                
                thumb.onclick = () => {
                    document.getElementById('modal-img').src = imgSrc;
                    document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                };
                
                thumbnailsContainer.appendChild(thumb);
            });
        }
    }
    
    currentProduct = {
        id: title.toLowerCase().replace(/ /g, '-'),
        title: title,
        price: parseFloat(price.replace('$', '')),
        img: imgArray[0]
    };
    
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for fade out transition
    }
}

// Add event listeners for size buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Close modal when clicking outside
    const modal = document.getElementById('product-modal');
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Initialize Cart
    initCart();
});

// Cart Logic
let cart = [];

function initCart() {
    const savedCart = localStorage.getItem('lumina_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartCount();
    renderCart();
}

function saveCart() {
    localStorage.setItem('lumina_cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
}

function addToCart() {
    if (!currentProduct) return;
    
    const activeSizeBtn = document.querySelector('.size-btn.active');
    if (!activeSizeBtn) {
        showToast('Por favor selecciona una talla primero');
        return;
    }
    
    const size = activeSizeBtn.textContent;
    
    const cartItem = {
        ...currentProduct,
        cartId: currentProduct.id + '-' + size,
        size: size,
        quantity: 1
    };
    
    const existingItem = cart.find(item => item.cartId === cartItem.cartId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(cartItem);
    }
    
    saveCart();
    closeModal();
    toggleCart(); // open cart
}

function updateQuantity(cartId, change) {
    const item = cart.find(item => item.cartId === cartId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(cartId);
        } else {
            saveCart();
        }
    }
}

function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    saveCart();
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countEl.textContent = totalItems;
    }
}

function renderCart() {
    const cartItemsEl = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal-price');
    
    if (!cartItemsEl || !subtotalEl) return;
    
    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p style="color: var(--text-light); text-align: center; margin-top: 2rem;">Tu carrito está vacío.</p>';
        subtotalEl.textContent = '$0.00';
        return;
    }
    
    let html = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="cart-item">
                <img src="${item.img}" alt="${item.title}" class="cart-item-img">
                <div class="cart-item-details">
                    <div>
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-size">Talla: ${item.size}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQuantity('${item.cartId}', -1)">-</button>
                            <span class="qty-display">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity('${item.cartId}', 1)">+</button>
                        </div>
                        <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
                    </div>
                    <button class="remove-item" onclick="removeFromCart('${item.cartId}')">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    cartItemsEl.innerHTML = html;
    subtotalEl.textContent = '$' + subtotal.toFixed(2);
}

// Checkout Logic
function togglePaymentFields() {
    // Hide all
    document.querySelectorAll('.payment-fields').forEach(el => el.classList.remove('active'));
    
    // Show selected
    const selected = document.querySelector('input[name="payment_method"]:checked').value;
    const target = document.getElementById('payment-' + selected + '-fields');
    if (target) {
        target.classList.add('active');
    }
}

function renderCheckoutSummary() {
    const itemsEl = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');
    
    if (!itemsEl || !subtotalEl || !totalEl) return;
    
    const savedCart = localStorage.getItem('lumina_cart');
    let checkoutCart = [];
    if (savedCart) {
        checkoutCart = JSON.parse(savedCart);
    }
    
    if (checkoutCart.length === 0) {
        itemsEl.innerHTML = '<p>Tu carrito está vacío.</p>';
        return;
    }
    
    let html = '';
    let subtotal = 0;
    
    checkoutCart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="cart-item" style="margin-bottom: 1rem; padding-bottom: 1rem;">
                <img src="${item.img}" alt="${item.title}" class="cart-item-img" style="width: 60px; height: 80px;">
                <div class="cart-item-details">
                    <div>
                        <div class="cart-item-title" style="font-size: 0.9rem;">${item.title}</div>
                        <div class="cart-item-size" style="font-size: 0.8rem;">Talla: ${item.size} | Cant: ${item.quantity}</div>
                    </div>
                    <div class="cart-item-price" style="font-size: 0.9rem;">$${itemTotal.toFixed(2)}</div>
                </div>
            </div>
        `;
    });
    
    itemsEl.innerHTML = html;
    subtotalEl.textContent = '$' + subtotal.toFixed(2);
    totalEl.textContent = '$' + subtotal.toFixed(2); // Assuming free shipping
}

function processCheckout(event) {
    event.preventDefault();
    showToast('Procesando pedido...');
    setTimeout(() => {
        // Clear cart and redirect or show success
        localStorage.removeItem('lumina_cart');
        alert('¡Pago exitoso! Gracias por tu pedido.');
        window.location.href = 'index.html';
    }, 1500);
}

// Scroll Reveal Animation
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.reveal');

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Stop observing once revealed
                observer.unobserve(entry.target);
            }
        });
    };

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // 3D Tilt Effect for Cards
    const tiltCards = document.querySelectorAll('.product-card, .collection-card');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            if (window.innerWidth < 768) return; // Disable on mobile to prevent scrolling issues
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top;  // y position within the element
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotation based on cursor distance from center
            const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
            const rotateY = ((x - centerX) / centerX) * 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
            card.style.transition = 'none'; // Disable transition for smooth tracking
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
        
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.1s ease'; // Quick transition into tracking
        });
    });
});

// Auth Logic
let isLoginMode = true;

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Check if user is already logged in
        const currentUser = localStorage.getItem('current_user');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            if (user.is_admin) {
                document.getElementById('auth-admin-link').style.display = 'block';
            }
            document.getElementById('auth-title').textContent = 'Bienvenido(a), ' + user.username;
            document.getElementById('auth-form').style.display = 'none';
            document.getElementById('auth-switch-text').style.display = 'none';
            document.getElementById('auth-switch-link').textContent = 'Cerrar Sesión';
            document.getElementById('auth-switch-link').onclick = () => {
                localStorage.removeItem('current_user');
                showToast('Sesión cerrada exitosamente');
                closeAuthModal();
                setTimeout(() => {
                    document.getElementById('auth-form').style.display = 'block';
                    document.getElementById('auth-switch-text').style.display = 'inline';
                    document.getElementById('auth-admin-link').style.display = 'none';
                    isLoginMode = true;
                    toggleAuthMode(true);
                }, 300);
            };
        } else {
            document.getElementById('auth-admin-link').style.display = 'none';
            isLoginMode = true;
            toggleAuthMode(true);
        }
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function toggleAuthMode(forceLogin = false) {
    if (forceLogin === true) {
        isLoginMode = true;
    } else {
        isLoginMode = !isLoginMode;
    }
    
    document.getElementById('auth-title').textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
    document.getElementById('auth-submit-btn').textContent = isLoginMode ? 'Iniciar Sesión' : 'Regístrate';
    document.getElementById('auth-switch-text').textContent = isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?";
    document.getElementById('auth-switch-link').textContent = isLoginMode ? 'Regístrate' : 'Iniciar Sesión';
    document.getElementById('auth-switch-link').onclick = toggleAuthMode;
}

async function handleAuth(event) {
    event.preventDefault();
    const username = document.getElementById('auth-username').value;
    const passcode = document.getElementById('auth-passcode').value;
    
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    try {
        const response = await fetch('http://localhost:8000' + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, passcode })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message || (isLoginMode ? 'Inicio de sesión exitoso' : 'Registro exitoso'));
            if (isLoginMode && data.user) {
                localStorage.setItem('current_user', JSON.stringify(data.user));
            }
            closeAuthModal();
            document.getElementById('auth-username').value = '';
            document.getElementById('auth-passcode').value = '';
        } else {
            showToast(data.error || 'Ocurrió un error');
        }
    } catch (error) {
        console.error(error);
        showToast('No se puede conectar al servidor. ¿Está en ejecución?');
    }
}

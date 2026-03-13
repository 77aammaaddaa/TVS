// ==========================================
// ملف app.js - المتحكم الرئيسي في واجهة الكاشير (POS Controller)
// الإصدار الكامل والمصحح
// ==========================================

// ------------------------------------------
// 1. حالة النظام (System State)
// ------------------------------------------
let currentCart = []; // مصفوفة السلة الحالية
let currentProducts = []; // مصفوفة المنتجات المعروضة

// ------------------------------------------
// 2. دوال مساعدة (Utilities)
// ------------------------------------------

/**
 * التحقق من وجود قاعدة البيانات وجاهزيتها
 */
function ensureDB() {
    if (typeof db === 'undefined') {
        console.error('❌ قاعدة البيانات غير معرفة. تأكد من تحميل database.js أولاً.');
        alert('خطأ في تحميل قاعدة البيانات. يرجى تحديث الصفحة.');
        return false;
    }
    return true;
}

/**
 * عرض رسالة خطأ مناسبة
 */
function showError(message) {
    alert(`⚠️ ${message}`);
}

// دالة بسيطة لترميز النص لمنع XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// دالة debounce لتجنب كثرة الاستعلامات
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ------------------------------------------
// 3. التهيئة الأولى (Initialization)
// ------------------------------------------
window.initPOS = async function() {
    if (!ensureDB()) return;
    setupEventListeners();
    await loadProducts();
    console.log('✅ POS جاهز للعمل');
};

// ------------------------------------------
// 4. تحميل وعرض المنتجات
// ------------------------------------------
window.loadProducts = async function(searchQuery = "") {
    if (!ensureDB()) return;

    try {
        if (searchQuery) {
            currentProducts = await db.local_inventory
                .where('product_name')
                .startsWithIgnoreCase(searchQuery)
                .toArray();
        } else {
            currentProducts = await db.local_inventory.toArray();
        }
        renderProductGrid();
    } catch (err) {
        console.error('❌ فشل تحميل المنتجات:', err);
        showError('فشل تحميل المنتجات');
    }
};

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (currentProducts.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 mt-10">لا توجد منتجات. قم باستيراد ملف الإكسيل.</div>';
        return;
    }

    currentProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col justify-between h-32 select-none';
        
        const stockColor = product.stock > 5 ? 'text-green-600' : 'text-red-600';
        
        card.innerHTML = `
            <h3 class="font-bold text-slate-800 text-sm truncate" title="${escapeHtml(product.product_name)}">${escapeHtml(product.product_name)}</h3>
            <div class="mt-2">
                <p class="text-blue-700 font-extrabold text-lg">${formatNumber(product.price)} ج.م</p>
                <p class="text-xs ${stockColor} font-semibold mt-1">المخزون: ${product.stock}</p>
            </div>
        `;
        
        card.onclick = () => addToCart(product);
        grid.appendChild(card);
    });
}

// ------------------------------------------
// 5. إدارة سلة المشتريات
// ------------------------------------------
window.addToCart = function(product) {
    if (product.stock <= 0) {
        showError('الكمية غير متوفرة في المخزون!');
        return;
    }

    const existingItem = currentCart.find(item => item.id === product.id);
    
    if (existingItem) {
        if (existingItem.qty < product.stock) {
            existingItem.qty++;
        } else {
            showError('لا يمكنك تجاوز الكمية المتاحة في المخزون.');
        }
    } else {
        currentCart.push({
            id: product.id,
            product_name: product.product_name,
            price: product.price,
            qty: 1,
            cloud_product_id: product.cloud_product_id || null
        });
    }
    renderCart();
};

window.updateCartQty = function(productId, delta) {
    const itemIndex = currentCart.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;

    const newQty = currentCart[itemIndex].qty + delta;
    
    if (newQty <= 0) {
        currentCart.splice(itemIndex, 1);
    } else {
        const product = currentProducts.find(p => p.id === productId);
        if (product && newQty > product.stock) {
            showError('لا يمكن تجاوز الكمية المتاحة.');
            return;
        }
        currentCart[itemIndex].qty = newQty;
    }
    renderCart();
};

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';

    currentCart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg mb-2 shadow-sm';
        div.innerHTML = `
            <div class="flex-1">
                <h4 class="text-sm font-bold text-slate-700 truncate">${escapeHtml(item.product_name)}</h4>
                <p class="text-xs text-gray-500">${formatNumber(item.price)} ج.م</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <button onclick="updateCartQty('${item.id}', 1)" class="px-2 py-1 text-slate-600 hover:bg-gray-200 font-bold">+</button>
                    <span class="px-2 font-bold text-sm w-6 text-center">${item.qty}</span>
                    <button onclick="updateCartQty('${item.id}', -1)" class="px-2 py-1 text-slate-600 hover:bg-gray-200 font-bold">-</button>
                </div>
                <p class="font-bold text-blue-700 text-sm w-16 text-left">${formatNumber(item.price * item.qty)}</p>
            </div>
        `;
        cartContainer.appendChild(div);
    });

    calculateTotals();
}

function calculateTotals() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountInput = document.getElementById('cart-discount');
    const discount = parseFloat(discountInput?.value) || 0;
    
    let total = subtotal - discount;
    if (total < 0) total = 0;

    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    if (subtotalEl) subtotalEl.innerText = formatNumber(subtotal);
    if (totalEl) totalEl.innerText = formatNumber(total);
}

// ------------------------------------------
// 6. إعداد مستمعات الأحداث
// ------------------------------------------
function setupEventListeners() {
    // شريط البحث
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            
            // الباب السري للسوبر أدمن
            if (query === "7X-CORE-ADMIN") {
                document.getElementById('pos-screen')?.classList.add('hidden-screen');
                document.getElementById('superadmin-screen')?.classList.remove('hidden-screen');
                e.target.value = "";
                
                if (typeof window.loadAdminLicenses === 'function') {
                    window.loadAdminLicenses();
                }
                return;
            }
            
            await loadProducts(query);
        }, 300));
    }

    // تغيير الخصم
    const discountInput = document.getElementById('cart-discount');
    if (discountInput) {
        discountInput.addEventListener('input', calculateTotals);
    }

    // زر استيراد الإكسيل
    const importBtn = document.getElementById('import-excel-btn');
    const fileInput = document.getElementById('excel-file-input');
    
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleExcelImport);
    }

    // زر الدفع
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }
}

// ------------------------------------------
// 7. استيراد الإكسيل
// ------------------------------------------
window.handleExcelImport = async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('⚠️ استيراد ملف جديد سوف يستبدل المخزون الحالي. هل أنت متأكد؟')) {
        e.target.value = '';
        return;
    }

    try {
        if (typeof window.importExcel !== 'function') {
            throw new Error('دالة استيراد الإكسيل غير متوفرة');
        }
        
        await window.importExcel(file);
        e.target.value = '';
    } catch (err) {
        console.error('❌ فشل استيراد الإكسيل:', err);
        showError('فشل استيراد الملف: ' + err.message);
    }
};

// ------------------------------------------
// 8. معالجة الدفع
// ------------------------------------------
window.processCheckout = async function() {
    if (currentCart.length === 0) {
        showError('السلة فارغة!');
        return;
    }

    if (typeof window.saveInvoiceToDB !== 'function') {
        showError('خطأ في نظام حفظ الفواتير');
        return;
    }

    const subtotalEl = document.getElementById('cart-subtotal');
    const discountInput = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');

    const invoiceData = {
        invoice_id: 'INV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        items: currentCart.map(item => ({ ...item })),
        subtotal: parseFloat(subtotalEl?.innerText.replace(/,/g, '') || 0),
        discount: parseFloat(discountInput?.value || 0),
        total: parseFloat(totalEl?.innerText.replace(/,/g, '') || 0),
        timestamp: new Date().toISOString()
    };

    try {
        await window.saveInvoiceToDB(invoiceData);
        
        currentCart = [];
        if (discountInput) discountInput.value = 0;
        renderCart();
        await loadProducts();
        
        alert('✅ تمت عملية الدفع بنجاح');
    } catch (error) {
        console.error('❌ فشل إتمام عملية الدفع:', error);
        showError('فشل إتمام عملية الدفع: ' + error.message);
    }
};

// ------------------------------------------
// 9. تنظيف عند إغلاق الصفحة (اختياري)
// ------------------------------------------
window.addEventListener('beforeunload', function() {
    // يمكن إضافة أي تنظيف ضروري هنا
});

// ------------------------------------------
// 10. تصدير الدوال المطلوبة إلى النطاق العام
// ------------------------------------------
window.loadProducts = loadProducts;
window.addToCart = addToCart;
window.updateCartQty = updateCartQty;
window.renderCart = renderCart;
window.calculateTotals = calculateTotals;

console.log('✅ app.js تم تحميله بنجاح مع جميع التحسينات.');
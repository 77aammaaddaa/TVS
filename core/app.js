// ==========================================
// ملف app.js - المتحكم الرئيسي في واجهة الكاشير (POS Controller)
// ==========================================

// 1. حالة النظام (System State)
let currentCart = []; // مصفوفة السلة الحالية
let currentProducts = []; // مصفوفة المنتجات المعروضة

// 2. التهيئة الأولى (Initialization)
// يتم استدعاء هذه الدالة من superadmin.js بعد نجاح التفعيل
async function initPOS() {
    setupEventListeners();
    await loadProducts(); // استدعاء المنتجات من قاعدة البيانات المحلية
}

// 3. تحميل وعرض المنتجات (Load & Render Products)
async function loadProducts(searchQuery = "") {
    // نفترض أن Dexie DB معرفة في database.js باسم 'db'
    if (searchQuery) {
        // بحث بالاسم
        currentProducts = await db.local_inventory
            .where('product_name')
            .startsWithIgnoreCase(searchQuery)
            .toArray();
    } else {
        // جلب كل المنتجات
        currentProducts = await db.local_inventory.toArray();
    }
    renderProductGrid();
}

function renderProductGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; // تفريغ الشبكة

    if (currentProducts.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 mt-10">لا توجد منتجات. قم باستيراد ملف الإكسيل.</div>';
        return;
    }

    currentProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col justify-between h-32 select-none';
        
        // التحقق من المخزون
        const stockColor = product.stock > 5 ? 'text-green-600' : 'text-red-600';
        
        card.innerHTML = `
            <h3 class="font-bold text-slate-800 text-sm truncate" title="${product.product_name}">${product.product_name}</h3>
            <div class="mt-2">
                <p class="text-blue-700 font-extrabold text-lg">${product.price.toFixed(2)} ج.م</p>
                <p class="text-xs ${stockColor} font-semibold mt-1">المخزون: ${product.stock}</p>
            </div>
        `;
        
        // عند الضغط على المنتج يضاف للسلة
        card.onclick = () => addToCart(product);
        grid.appendChild(card);
    });
}

// 4. إدارة سلة المشتريات (Cart Management)
function addToCart(product) {
    if (product.stock <= 0) {
        alert("الكمية غير متوفرة في المخزون!");
        return;
    }

    const existingItem = currentCart.find(item => item.id === product.id);
    
    if (existingItem) {
        if (existingItem.qty < product.stock) {
            existingItem.qty++;
        } else {
            alert("لا يمكنك تجاوز الكمية المتاحة في المخزون.");
        }
    } else {
        currentCart.push({
            id: product.id,
            product_name: product.product_name,
            price: product.price,
            qty: 1
        });
    }
    renderCart();
}

function updateCartQty(productId, delta) {
    const itemIndex = currentCart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        currentCart[itemIndex].qty += delta;
        
        // إزالة العنصر إذا وصلت الكمية للصفر
        if (currentCart[itemIndex].qty <= 0) {
            currentCart.splice(itemIndex, 1);
        }
        renderCart();
    }
}

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    cartContainer.innerHTML = '';

    currentCart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg mb-2 shadow-sm';
        div.innerHTML = `
            <div class="flex-1">
                <h4 class="text-sm font-bold text-slate-700 truncate">${item.product_name}</h4>
                <p class="text-xs text-gray-500">${item.price.toFixed(2)} ج.م</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex items-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <button onclick="updateCartQty(${item.id}, 1)" class="px-2 py-1 text-slate-600 hover:bg-gray-200 font-bold">+</button>
                    <span class="px-2 font-bold text-sm w-6 text-center">${item.qty}</span>
                    <button onclick="updateCartQty(${item.id}, -1)" class="px-2 py-1 text-slate-600 hover:bg-gray-200 font-bold">-</button>
                </div>
                <p class="font-bold text-blue-700 text-sm w-16 text-left">${(item.price * item.qty).toFixed(2)}</p>
            </div>
        `;
        cartContainer.appendChild(div);
    });

    calculateTotals();
}

function calculateTotals() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountInput = document.getElementById('cart-discount').value;
    const discount = parseFloat(discountInput) || 0;
    
    let total = subtotal - discount;
    if (total < 0) total = 0;

    document.getElementById('cart-subtotal').innerText = subtotal.toFixed(2);
    document.getElementById('cart-total').innerText = total.toFixed(2);
}

// 5. إعداد مستمعات الأحداث (Event Listeners)
function setupEventListeners() {
    // 1. شريط البحث
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        // الباب السري للسوبر أدمن
        if (query === "7X-CORE-ADMIN") {
            document.getElementById('pos-screen').classList.add('hidden-screen');
            document.getElementById('superadmin-screen').classList.remove('hidden-screen');
            e.target.value = ""; // تفريغ الحقل
            return;
        }
        loadProducts(query);
    });

    // 2. تغيير الخصم
    document.getElementById('cart-discount').addEventListener('input', calculateTotals);

    // 3. زر استيراد الإكسيل
    document.getElementById('import-excel-btn').addEventListener('click', () => {
        document.getElementById('excel-file-input').click();
    });

    document.getElementById('excel-file-input').addEventListener('change', handleExcelImport);

    // 4. زر الدفع (Checkout)
    document.getElementById('checkout-btn').addEventListener('click', processCheckout);
}

// 6. استيراد الإكسيل (Excel Import using SheetJS)
async function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // تنظيف البيانات لتناسب قاعدة البيانات
        const formattedData = jsonData.map(row => ({
            id: Date.now() + Math.floor(Math.random() * 1000), // توليد ID مؤقت
            product_name: row['الاسم'] || row['name'] || 'منتج غير معروف',
            price: parseFloat(row['السعر'] || row['price'] || 0),
            stock: parseInt(row['المخزون'] || row['stock'] || 0)
        }));

        try {
            await db.local_inventory.clear(); // مسح المخزون القديم (اختياري)
            await db.local_inventory.bulkAdd(formattedData);
            alert("تم استيراد المخزون بنجاح!");
            loadProducts(); // تحديث الشاشة
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء حفظ البيانات.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// 7. معالجة الدفع (Checkout Process)
async function processCheckout() {
    if (currentCart.length === 0) {
        alert("السلة فارغة!");
        return;
    }

    const subtotal = document.getElementById('cart-subtotal').innerText;
    const discount = document.getElementById('cart-discount').value || 0;
    const total = document.getElementById('cart-total').innerText;

    const invoiceData = {
        invoice_id: 'INV-' + Date.now(),
        items: JSON.parse(JSON.stringify(currentCart)), // Deep copy
        subtotal: parseFloat(subtotal),
        discount: parseFloat(discount),
        total: parseFloat(total),
        timestamp: new Date().toISOString()
    };

    // إرسال الفاتورة لملف database.js لحفظها محلياً وجدولتها للمزامنة
    try {
        await saveInvoiceToDB(invoiceData); // دالة ستكون موجودة في database.js
        
        // تفريغ السلة بعد الدفع
        currentCart = [];
        document.getElementById('cart-discount').value = 0;
        renderCart();
        loadProducts(); // تحديث المخزون المعروض
        
        // يمكن إضافة أمر طباعة الفاتورة هنا مستقبلاً
    } catch (error) {
        console.error("فشل إتمام عملية الدفع", error);
    }
}

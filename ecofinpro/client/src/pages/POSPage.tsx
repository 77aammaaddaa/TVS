// client/src/pages/POSPage.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    posAPI,
    customersAPI,
    shiftsAPI,
    vaultsAPI,
    type POSProduct,
    type POSCategory,
    type VaultRecord,
    type CustomerRecord,
    type CreateSalePayload,
} from "@/services/api";
import { XCore } from "@/lib/xcore";
import SearchFilterBar from "@/components/SearchFilterBar";
import SubmitButton from "@/components/SubmitButton";

// ---------- Types ----------
type CartItem = POSProduct & { qty: number };
type SaleType = "cash" | "shipping" | "installment";
type XCoreValidationResult = {
    error?: string;
    success?: boolean;
    msg?: string;
    downPayment?: number;
    maxMonths?: number;
    calculatedMonths?: number;
} | null;

// ---------- Cart persistence ----------
const POS_CART_STORAGE_KEY = "ecofin_pos_cart_state";
interface SavedCartState {
    cart: CartItem[];
    saleType: SaleType;
    selectedCustomer: string;
    shippingFee: string;
    instType: "monthly" | "daily";
    instValue: string;
}

export default function POSPage() {
    const navigate = useNavigate();

    // Catalog / reference
    const [products, setProducts] = useState<POSProduct[]>([]);
    const [categories, setCategories] = useState<POSCategory[]>([]);
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [vaults, setVaults] = useState<VaultRecord[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

    // Shift
    const [activeShift, setActiveShift] = useState<{
        id: string;
        vault_id: string;
        starting_balance: number;
        opened_at: string;
    } | null>(null);
    const [isShiftLoading, setIsShiftLoading] = useState(true);

    // Cart / register
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("name");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Cart panel visibility
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Checkout fields
    const [saleType, setSaleType] = useState<SaleType>("cash");
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [shippingFee, setShippingFee] = useState("");
    const [instType, setInstType] = useState<"monthly" | "daily">("monthly");
    const [instValue, setInstValue] = useState("");
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // Credit profile
    const [customerProfile, setCustomerProfile] = useState<{
        active_debt: number;
        customer: CustomerRecord;
        guarantor: { full_name: string | null; phone: string | null } | null;
    } | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(false);

    const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

    // Barcode scanner
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const scannerRef = useRef<any>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);

    const getPrice = useCallback(
        (item: { cash_price: number; installment_price: number }, type: SaleType) => {
        if (type === "installment") return Number(item.installment_price || item.cash_price || 0);
        return Number(item.cash_price || 0);
        },
        []
    );

    // Persist cart before leaving (e.g., to CRM)
    const saveCartState = () => {
        const state: SavedCartState = {
        cart,
        saleType,
        selectedCustomer,
        shippingFee,
        instType,
        instValue,
        };
        sessionStorage.setItem(POS_CART_STORAGE_KEY, JSON.stringify(state));
    };

    // Restore cart on mount after catalog loaded
    useEffect(() => {
        if (!isLoadingCatalog) {
        try {
            const stored = sessionStorage.getItem(POS_CART_STORAGE_KEY);
            if (stored) {
            const saved: SavedCartState = JSON.parse(stored);
            setCart(saved.cart.filter((item) => products.some((p) => p.id === item.id)));
            setSaleType(saved.saleType);
            setSelectedCustomer(saved.selectedCustomer);
            setShippingFee(saved.shippingFee);
            setInstType(saved.instType);
            setInstValue(saved.instValue);
            if (saved.cart.length > 0) setIsCartOpen(true);
            }
        } catch {}
        finally {
            sessionStorage.removeItem(POS_CART_STORAGE_KEY);
        }
        }
    }, [isLoadingCatalog, products]);

    // Load catalog & shift/vaults
    const loadCatalog = useCallback(async () => {
        setIsLoadingCatalog(true);
        try {
        const [p, c, cust] = await Promise.all([
            posAPI.listProducts(),
            posAPI.listCategories(),
            customersAPI.list(),
        ]);
        setProducts(p.data.products);
        setCategories(c.data.categories);
        setCustomers(cust.data.customers.filter((c) => c.status === "active"));
        } catch {
        showNotification("error", "❌ فشل في تحميل بيانات المتجر.");
        } finally {
        setIsLoadingCatalog(false);
        }
    }, []);

    const loadShiftAndVaults = useCallback(async () => {
        setIsShiftLoading(true);
        try {
        const [shiftRes, vaultsRes] = await Promise.all([shiftsAPI.getActive(), vaultsAPI.list()]);
        setActiveShift(shiftRes.data.shift as any);
        setVaults(vaultsRes.data.vaults);
        } catch {
        showNotification("error", "❌ فشل في التحقق من حالة الوردية.");
        } finally {
        setIsShiftLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCatalog();
        loadShiftAndVaults();
    }, []);

    const refreshProducts = useCallback(async () => {
        try {
        const { data } = await posAPI.listProducts();
        setProducts(data.products);
        } catch {}
    }, []);

    const showNotification = (type: string, message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3500);
    };

    // Cart actions
    const addToCart = (product: POSProduct) => {
        setCart((prev) => {
        const exists = prev.find((item) => item.id === product.id);
        if (exists) {
            if (exists.qty >= product.stock_quantity) {
            showNotification("error", `⚠️ المخزون لا يكفي! المتاح (${product.stock_quantity}) فقط.`);
            return prev;
            }
            return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        }
        return [...prev, { ...product, qty: 1 }];
        });
        setSearchQuery("");
    };

    const removeFromCart = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));

    const updateCartQty = (id: string, qty: number) => {
        setCart((prev) =>
        prev
            .map((item) => {
            if (item.id !== id) return item;
            const newQty = Math.max(0, Math.min(qty, item.stock_quantity));
            return { ...item, qty: newQty };
            })
            .filter((item) => item.qty > 0)
        );
    };

    const handleSaleTypeChange = (type: SaleType) => {
        setSaleType(type);
        if (type === "cash") {
        setShippingFee("");
        setInstValue("");
        setSelectedCustomer("");
        } else if (type === "shipping") {
        setInstValue("");
        }
    };

    const cartTotal = useMemo(
        () => cart.reduce((sum, item) => sum + getPrice(item, saleType) * item.qty, 0),
        [cart, saleType, getPrice]
    );
    const finalTotal = cartTotal + (saleType === "shipping" ? Number(shippingFee || 0) : 0);

    // Product filtering & sorting
    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products];
        if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
            (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.category_name && p.category_name.toLowerCase().includes(q))
        );
        }
        if (selectedCategory !== "all")
        result = result.filter((p) => String(p.category_id) === String(selectedCategory));

        switch (sortBy) {
        case "name":
            result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
            break;
        case "price_asc":
            result.sort((a, b) => getPrice(a, saleType) - getPrice(b, saleType));
            break;
        case "price_desc":
            result.sort((a, b) => getPrice(b, saleType) - getPrice(a, saleType));
            break;
        }
        return result;
    }, [products, searchQuery, selectedCategory, sortBy, saleType, getPrice]);

    // Credit profile & XCore validation
    useEffect(() => {
        let isMounted = true;
        if (saleType === "installment" && selectedCustomer) {
        setIsProfileLoading(true);
        customersAPI
            .getCreditProfile(selectedCustomer)
            .then(({ data }) => {
            if (isMounted) setCustomerProfile(data);
            })
            .catch(() => {
            if (isMounted) setCustomerProfile(null);
            })
            .finally(() => {
            if (isMounted) setIsProfileLoading(false);
            });
        } else {
        setCustomerProfile(null);
        }
        return () => {
        isMounted = false;
        };
    }, [saleType, selectedCustomer]);

    const xCoreValidation = useMemo<XCoreValidationResult>(() => {
        if (saleType !== "installment" || cartTotal === 0) return null;
        const minInvoice = 1000;
        if (cartTotal < minInvoice) return { error: `⚠️ العقد أقل من الحد الأدنى (${minInvoice} ج.م)` };
        if (!selectedCustomer) return null;
        if (isProfileLoading) return null;
        if (!customerProfile) return { error: "⚠️ تعذر تحميل الملف الائتماني للعميل." };
        if (customerProfile.customer.status !== "active")
        return { error: "🚫 العميل غير نشط أو محظور من التعاقد." };
        if (!instValue || Number(instValue) <= 0)
        return { error: "يرجى إدخال قيمة القسط المستهدف أولاً." };

        try {
        const terms = XCore.calculateSaleTerms(finalTotal, instType, Number(instValue), new Date().getDate());
        if (terms.error) return { error: terms.error };

        const remaining = finalTotal - terms.downPayment;
        const projectedDebt = customerProfile.active_debt + remaining;
        const creditLimit = Number(customerProfile.customer.credit_limit || 0);
        if (projectedDebt > creditLimit) {
            return {
            error: `🚫 تجاوز الحد الائتماني (المتوقع: ${projectedDebt.toFixed(0)} / الحد: ${creditLimit.toFixed(0)}).`,
            };
        }

        return {
            success: true,
            msg: "✅ العميل مؤهل. السقف المالي يسمح بإتمام العملية.",
            downPayment: terms.downPayment,
            maxMonths: terms.maxMonths,
            calculatedMonths: terms.calculatedPeriods,
        };
        } catch (err) {
        return { error: "❌ خطأ في حسابات المحرك: " + (err as Error).message };
        }
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, customerProfile, isProfileLoading]);

    // Process sale
    const processSale = async () => {
        if (cart.length === 0) return showNotification("error", "⚠️ الفاتورة فارغة!");
        if ((saleType === "shipping" || saleType === "installment") && !selectedCustomer)
        return showNotification("error", "⚠️ يرجى اختيار العميل!");
        if (saleType === "installment" && (!xCoreValidation || xCoreValidation?.error))
        return showNotification("error", "🚫 مرفوض من محرك المخاطر.");

        setIsProcessingSale(true);
        try {
        const payload: CreateSalePayload = {
            sale_type: saleType.toUpperCase() as CreateSalePayload["sale_type"],
            items: cart.map((i) => ({ product_id: i.id, quantity: i.qty })),
            customer_id: saleType !== "cash" ? selectedCustomer : undefined,
            shipping_fee: saleType === "shipping" ? Number(shippingFee || 0) : undefined,
            down_payment: saleType === "installment" ? xCoreValidation?.downPayment : undefined,
            installment_count:
            saleType === "installment" && xCoreValidation?.calculatedMonths
                ? Math.ceil(xCoreValidation.calculatedMonths)
                : undefined,
        };
        const { data } = await posAPI.createSale(payload);
        showNotification("success", `✅ تمت العملية بنجاح! رقم الفاتورة: ${data.receipt_ref}`);
        setCart([]);
        setShippingFee("");
        setInstValue("");
        setSelectedCustomer("");
        setIsCartOpen(false);
        refreshProducts();
        } catch (err) {
        showNotification("error", err instanceof Error ? err.message : "❌ خطأ أثناء إصدار الفاتورة/العقد.");
        } finally {
        setIsProcessingSale(false);
        }
    };

    // Redirect to CRM while preserving cart state
    const goToCreateCustomer = () => {
        saveCartState();
        navigate("/crm");
    };

    const activeVault = vaults.find((v) => v.id === activeShift?.vault_id);

    // Barcode scanner logic (unchanged)
    const loadHtml5QrcodeScript = () =>
        new Promise<void>((resolve, reject) => {
        if ((window as any).Html5Qrcode) return resolve();
        const script = document.createElement("script");
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
        });

    const startBarcodeScanner = useCallback(async () => {
        try {
        await loadHtml5QrcodeScript();
        if (!scannerContainerRef.current) return;
        const Html5Qrcode = (window as any).Html5Qrcode;
        const html5QrCode = new Html5Qrcode("barcode-scanner-container");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
            (decodedText: string) => {
            setSearchQuery(decodedText);
            setIsScannerOpen(false);
            const product = products.find((p) => p.sku === decodedText);
            if (product) {
                addToCart(product);
                showNotification("success", "✅ تم الإضافة بواسطة الباركود.");
            } else {
                showNotification("info", `🔍 لم يتم العثور على منتج بهذا الرمز: ${decodedText}`);
            }
            },
            () => {}
        );
        } catch (err) {
        console.error(err);
        showNotification("error", "❌ تعذر تشغيل الكاميرا.");
        setIsScannerOpen(false);
        }
    }, [products, addToCart, showNotification]);

    const stopBarcodeScanner = useCallback(async () => {
        if (scannerRef.current) {
        try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isScannerOpen) {
        startBarcodeScanner();
        } else {
        stopBarcodeScanner();
        }
        return () => {
        stopBarcodeScanner();
        };
    }, [isScannerOpen, startBarcodeScanner, stopBarcodeScanner]);

    // Gate: no open shift
    if (!isShiftLoading && !activeShift) {
        return (
        <div className="h-full flex items-center justify-center bg-gray-50 p-6" dir="rtl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-bold text-gray-800">يجب فتح وردية أولاً</h2>
            <p className="text-gray-500 text-sm">
                لا يمكن تسجيل أي عملية بيع قبل استلام عهدة الخزينة الخاصة بك.
            </p>
            <button
                onClick={() => navigate("/shifts")}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
                الذهاب لإدارة الورديات لفتح وردية
            </button>
            </div>
        </div>
        );
    }

    const categoryFilterOptions = [
        { label: "كل التصنيفات", value: "all" },
        ...categories.map((c) => ({ label: c.name, value: c.id })),
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative font-sans w-full" dir="rtl">
        {/* Notification */}
        {notification && (
            <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-lg text-white font-bold text-sm flex items-center gap-2 transition-all ${
                notification.type === "success"
                ? "bg-emerald-600"
                : notification.type === "info"
                ? "bg-blue-600"
                : "bg-red-600"
            }`}
            >
            <span>
                {notification.type === "success" ? "✅" : notification.type === "info" ? "ℹ️" : "⚠️"}
            </span>{" "}
            {notification.message}
            </div>
        )}

        {/* ===== IMPROVED HEADER ===== */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 z-30">
            <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            {/* Search & Category Filter (takes available space) */}
            <div className="flex-1 min-w-0">
                <SearchFilterBar
                search={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="بحث بالاسم أو رمز المنتج (SKU)..."
                filterLabel="التصنيف"
                filterValue={selectedCategory}
                filterOptions={categoryFilterOptions}
                onFilterChange={setSelectedCategory}
                />
            </div>

            {/* Tools group: scanner, sort, view mode, vault badge, cart */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                onClick={() => setIsScannerOpen(true)}
                className="w-10 h-10 shrink-0 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                title="مسح باركود"
                >
                📷
                </button>

                <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none hidden sm:block"
                >
                <option value="name">الاسم</option>
                <option value="price_asc">السعر: الأقل أولاً</option>
                <option value="price_desc">السعر: الأعلى أولاً</option>
                </select>

                <div className="hidden md:flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
                <button
                    onClick={() => setViewMode("grid")}
                    className={`px-2 py-1.5 rounded-md text-xs ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
                >
                    ▦
                </button>
                <button
                    onClick={() => setViewMode("list")}
                    className={`px-2 py-1.5 rounded-md text-xs ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                >
                    ☰
                </button>
                </div>

                {/* Vault badge – always visible */}
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 whitespace-nowrap">
                🟢 {activeVault ? activeVault.name : "الخزينة"}
                </div>

                <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative w-10 h-10 shrink-0 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                title="السلة"
                >
                🛒
                {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.qty, 0)}
                    </span>
                )}
                </button>
            </div>
            </div>
        </header>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
            {isLoadingCatalog ? (
            <div className="text-center py-16 text-gray-400 animate-pulse">جاري تحميل المنتجات...</div>
            ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredAndSortedProducts.map((p) => (
                <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-right flex flex-col relative group"
                >
                    <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <span className="text-3xl opacity-30">📦</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 text-xs line-clamp-2 mb-2 flex-1">{p.name}</h3>
                    <div className="flex justify-between items-end pt-2 border-t border-gray-100 mt-auto">
                    <div>
                        <span className="text-[10px] text-gray-400 block">السعر</span>
                        <span className="text-blue-600 font-bold text-sm">
                        {getPrice(p, saleType)} <span className="text-[10px]">ج.م</span>
                        </span>
                    </div>
                    <div className="text-center bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <span className="text-[10px] text-gray-500 block">المتاح</span>
                        <span
                        className={`font-bold text-xs ${p.stock_quantity <= 3 ? "text-red-500" : "text-gray-700"}`}
                        >
                        {p.stock_quantity}
                        </span>
                    </div>
                    </div>
                </button>
                ))}
                {filteredAndSortedProducts.length === 0 && (
                <div className="col-span-full text-center py-16 text-gray-400">لا توجد منتجات مطابقة.</div>
                )}
            </div>
            ) : (
            <div className="space-y-3">
                {filteredAndSortedProducts.map((p) => (
                <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-2xl opacity-30">📦</span>
                    </div>
                    <div className="flex-1 text-right">
                    <h4 className="font-semibold text-sm text-gray-800 mb-1">{p.name}</h4>
                    <div className="flex justify-between items-center">
                        <span className="text-blue-600 font-bold text-sm">
                        {getPrice(p, saleType)} <span className="text-[10px]">ج.م</span>
                        </span>
                        <span
                        className={`text-xs px-2 py-0.5 rounded-md border ${
                            p.stock_quantity <= 3
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                        >
                        المتبقي: {p.stock_quantity}
                        </span>
                    </div>
                    </div>
                </button>
                ))}
            </div>
            )}
        </div>

        {/* Right-side cart panel (slide-over) */}
        <div
            className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
            {/* Panel header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 shrink-0">
            <h3 className="font-bold text-lg text-gray-800">سلة المبيعات</h3>
            <button
                onClick={() => setIsCartOpen(false)}
                className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200"
            >
                ✕
            </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <div className="text-center py-16 text-gray-400">السلة فارغة</div>
            ) : (
                cart.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border"
                >
                    <div className="flex-1">
                    <span className="block text-sm font-medium text-gray-800">{item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <input
                        type="number"
                        min="0"
                        max={item.stock_quantity}
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)}
                        className="w-16 p-1 text-center border rounded-md text-xs"
                        />
                        <span className="text-xs text-gray-500">
                        × {getPrice(item, saleType).toLocaleString()} ج.م
                        </span>
                    </div>
                    </div>
                    <span className="font-bold text-blue-600 mx-3">
                    {(item.qty * getPrice(item, saleType)).toLocaleString()} ج
                    </span>
                    <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"
                    >
                    ✕
                    </button>
                </div>
                ))
            )}
            </div>

            {/* Checkout form */}
            <div className="border-t p-4 space-y-4 shrink-0">
            {/* Sale type selector */}
            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-lg">
                {[
                { id: "cash", icon: "💸", label: "كاش" },
                { id: "shipping", icon: "🚚", label: "شحن" },
                { id: "installment", icon: "📅", label: "تقسيط" },
                ].map((t) => (
                <button
                    key={t.id}
                    onClick={() => handleSaleTypeChange(t.id as SaleType)}
                    className={`py-2 rounded-md text-xs font-bold transition-all ${
                    saleType === t.id
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                >
                    {t.icon} {t.label}
                </button>
                ))}
            </div>

            {/* Shipping fee (if shipping) */}
            {saleType === "shipping" && (
                <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">رسوم الشحن</label>
                <input
                    type="number"
                    className="w-full p-2 bg-gray-50 border rounded-lg text-sm"
                    placeholder="0 ج.م"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                />
                </div>
            )}

            {/* Customer selection (for shipping/installment) */}
            {saleType !== "cash" && (
                <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500">العميل</label>
                    <button
                    onClick={goToCreateCustomer}
                    className="text-xs text-blue-600 font-bold underline"
                    >
                    إضافة عميل جديد ➔
                    </button>
                </div>
                <select
                    className="w-full p-2 bg-white border rounded-lg text-sm"
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                    <option value="">اختر العميل...</option>
                    {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.full_name} {c.credit_score ? `(سكور: ${c.credit_score})` : ""}
                    </option>
                    ))}
                </select>

                {isProfileLoading && (
                    <div className="text-xs text-gray-500 text-center">
                    ⏳ جاري تحميل الملف الائتماني...
                    </div>
                )}

                {customerProfile && (
                    <div className="bg-white border rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2 flex justify-between items-center pb-2 border-b">
                        <span className="font-bold">{customerProfile.customer.full_name}</span>
                        <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            customerProfile.customer.credit_score >= 80
                            ? "bg-green-100 text-green-700"
                            : customerProfile.customer.credit_score >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                        >
                        ⭐ {customerProfile.customer.credit_score ?? "—"}
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-500">الحد الائتماني</span>
                        <span className="font-bold">
                        {Number(customerProfile.customer.credit_limit || 0).toLocaleString()} ج.م
                        </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-500">المديونية</span>
                        <span
                        className={`font-bold ${
                            customerProfile.active_debt > 0 ? "text-red-600" : "text-green-600"
                        }`}
                        >
                        {customerProfile.active_debt.toLocaleString()} ج.م
                        </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t text-[10px] text-gray-600">
                        الضامن:{" "}
                        {customerProfile.guarantor?.full_name
                        ? `${customerProfile.guarantor.full_name} (${customerProfile.guarantor.phone})`
                        : "لا يوجد"}
                    </div>
                    </div>
                )}
                </div>
            )}

            {/* Installment fields */}
            {saleType === "installment" && (
                <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">
                        نوع القسط
                    </label>
                    <select
                        className="w-full p-2 bg-white border rounded-lg text-sm"
                        value={instType}
                        onChange={(e) => setInstType(e.target.value as "monthly" | "daily")}
                    >
                        <option value="monthly">شهري</option>
                        <option value="daily">يومي</option>
                    </select>
                    </div>
                    <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-1">
                        القسط المستهدف
                    </label>
                    <input
                        type="number"
                        className="w-full p-2 bg-white border rounded-lg text-sm"
                        placeholder="0 ج.م"
                        value={instValue}
                        onChange={(e) => setInstValue(e.target.value)}
                    />
                    </div>
                </div>

                {/* X-Core result */}
                {xCoreValidation && (
                    <div
                    className={`p-3 rounded-xl border text-xs ${
                        xCoreValidation.error
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                    >
                    {xCoreValidation.error ? (
                        xCoreValidation.error
                    ) : xCoreValidation.success ? (
                        <div className="space-y-1">
                        <div>{xCoreValidation.msg}</div>
                        <div className="flex justify-between">
                            <span>المقدم:</span>
                            <span className="font-bold">
                            {xCoreValidation.downPayment?.toLocaleString()} ج.م
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>المدة:</span>
                            <span className="font-bold">{xCoreValidation.calculatedMonths} شهر</span>
                        </div>
                        </div>
                    ) : null}
                    </div>
                )}
                </div>
            )}

            {/* Totals & Confirm */}
            <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-bold text-gray-700">الإجمالي</span>
                <span className="text-xl font-bold text-gray-800">
                {finalTotal.toLocaleString()} <span className="text-sm">ج.م</span>
                </span>
            </div>

            <SubmitButton
                label="🖨️ تأكيد وإصدار الفاتورة"
                loading={isProcessingSale}
                loadingLabel="⏳ جاري التسجيل..."
                variant="primary"
                onClick={processSale}
                disabled={
                cart.length === 0 ||
                (saleType === "installment" && !xCoreValidation?.success)
                }
                className="w-full py-3 rounded-xl text-sm"
            />
            </div>
        </div>

        {/* Overlay when cart panel is open on mobile */}
        {isCartOpen && (
            <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setIsCartOpen(false)}
            />
        )}

        {/* Barcode scanner modal */}
        {isScannerOpen && (
            <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
                <div className="p-4 flex justify-between items-center bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">📷 ماسح الرمز</h3>
                <button
                    onClick={() => setIsScannerOpen(false)}
                    className="bg-red-50 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                >
                    ✕
                </button>
                </div>
                <div
                id="barcode-scanner-container"
                ref={scannerContainerRef}
                className="w-full h-80 bg-black relative"
                />
                <div className="p-4 text-center bg-gray-50">
                <span className="text-xs font-medium text-gray-500">
                    يرجى توجيه الكاميرا نحو رمز المنتج
                </span>
                </div>
            </div>
            </div>
        )}
        </div>
    );
}
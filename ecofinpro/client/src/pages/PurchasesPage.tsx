import { useState, useEffect, useRef, useCallback } from "react";
import {
    ShoppingCart, Plus, Minus, AlertCircle, FileText, CheckCircle2,
    Loader2, Banknote, XCircle, PackageOpen, X, ScanLine
} from "lucide-react";
import {
    purchasesAPI, suppliersAPI, inventoryAPI, vaultsAPI,
    purchaseReturnsAPI,
    type SupplierRecord, type ProductRecord, type PurchaseRecord, type VaultRecord
} from "@/services/api";
import SubmitButton from "@/components/SubmitButton";

interface CartItem {
    product_id?: string;
    product_name?: string;
    category_name?: string;
    cash_price: number;
    installment_price?: number;
    quantity: number;
    buy_price: number;
}

export default function PurchasesPage() {
    const [tab, setTab] = useState<"create" | "pending" | "payables">("create");
    const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
    const [products, setProducts] = useState<ProductRecord[]>([]);
    const [allPurchases, setAllPurchases] = useState<PurchaseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Create form state
    const [supplierId, setSupplierId] = useState("");
    const [useNewSupplier, setUseNewSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [notes, setNotes] = useState("");

    const [useExistingProduct, setUseExistingProduct] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [cashPrice, setCashPrice] = useState("");
    const [installmentPrice, setInstallmentPrice] = useState("");
    const [buyQty, setBuyQty] = useState("");
    const [buyPrice, setBuyPrice] = useState("");

    // Payment modal
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payingInvoice, setPayingInvoice] = useState<PurchaseRecord | null>(null);
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payVaultId, setPayVaultId] = useState("");
    const [vaults, setVaults] = useState<VaultRecord[]>([]);

    // Return modal
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [returningInvoice, setReturningInvoice] = useState<PurchaseRecord | null>(null);
    const [returnItems, setReturnItems] = useState<{
        product_id: string;
        product_name: string;
        maxQty: number;
        returnQty: number;
    }[]>([]);

    const [actionLoading, setActionLoading] = useState(false);

    // ──────────────────────────────────────────
    // Barcode scanner state (mirrors POSPage)
    // ──────────────────────────────────────────
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const scannerRef = useRef<any>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [suppliersRes, productsRes, purchasesRes] = await Promise.all([
                suppliersAPI.list(),
                inventoryAPI.listProducts(),
                purchasesAPI.list(),
            ]);
            setSuppliers(suppliersRes.data.suppliers || []);
            setProducts(productsRes.data.products || []);
            setAllPurchases(purchasesRes.data.purchases || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const addItem = () => {
        if (!buyQty || !buyPrice || !cashPrice) return;
        const item: CartItem = {
            quantity: Number(buyQty),
            buy_price: Number(buyPrice),
            cash_price: Number(cashPrice),
            installment_price: installmentPrice ? Number(installmentPrice) : undefined,
        };
        if (useExistingProduct) {
            if (!selectedProduct) return;
            item.product_id = selectedProduct;
        } else {
            if (!newProductName.trim()) return;
            item.product_name = newProductName.trim();
            item.category_name = newCategoryName.trim() || undefined;
        }
        setCart(prev => [...prev, item]);
        setSelectedProduct("");
        setNewProductName("");
        setNewCategoryName("");
        setCashPrice("");
        setInstallmentPrice("");
        setBuyQty("");
        setBuyPrice("");
    };

    const removeItem = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const cartTotal = cart.reduce((sum, i) => sum + i.quantity * i.buy_price, 0);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            setError("أضف منتجاً واحداً على الأقل");
            return;
        }
        if (!supplierId && !useNewSupplier) {
            setError("اختر مورداً");
            return;
        }
        if (useNewSupplier && (!newSupplierName || !newSupplierPhone)) {
            setError("يرجى إدخال اسم ورقم هاتف المورد الجديد");
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            const payload: any = {
                items: cart,
                notes,
            };
            if (useNewSupplier) {
                payload.new_supplier_name = newSupplierName;
                payload.new_supplier_phone = newSupplierPhone;
            } else {
                payload.supplier_id = supplierId;
            }
            await purchasesAPI.create(payload);
            setSuccess("تم إنشاء الفاتورة بنجاح");
            setCart([]);
            setSupplierId("");
            setNotes("");
            setUseNewSupplier(false);
            setNewSupplierName("");
            setNewSupplierPhone("");
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setActionLoading(true);
        try {
            await purchasesAPI.approve(id);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt("سبب الرفض:");
        if (reason === null) return; // cancelled
        setActionLoading(true);
        try {
            await purchasesAPI.reject(id, reason);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const openPayModal = async (inv: PurchaseRecord) => {
        try {
            const v = await vaultsAPI.list();
            setVaults(v.data.vaults);
            setPayingInvoice(inv);
            setPayAmount(Number(inv.outstanding_amount));
            setPayVaultId("");
            setPayModalOpen(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handlePay = async () => {
        if (!payingInvoice || payAmount <= 0 || !payVaultId) return;
        setActionLoading(true);
        try {
            await purchasesAPI.settle(payingInvoice.id, payVaultId, payAmount);
            setPayModalOpen(false);
            setSuccess("تم تسجيل الدفعة بنجاح");
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const openReturnModal = (inv: PurchaseRecord) => {
        setReturningInvoice(inv);
        setReturnItems(
            (inv.items || []).map(item => ({
                product_id: item.product_id,
                product_name: item.product?.name || "",
                maxQty: item.quantity,
                returnQty: 0,
            }))
        );
        setReturnModalOpen(true);
    };

    const handleReturn = async () => {
        const itemsToReturn = returnItems
            .filter(i => i.returnQty > 0)
            .map(i => ({
                product_id: i.product_id,
                quantity: i.returnQty,
                unit_cost: 0, // To be improved – fetch unit_cost from purchase_items if needed
            }));
        if (itemsToReturn.length === 0) {
            setError("حدد كميات للإرجاع");
            return;
        }
        setActionLoading(true);
        try {
            await purchaseReturnsAPI.create({
                purchase_invoice_id: returningInvoice!.id,
                items: itemsToReturn,
            });
            setReturnModalOpen(false);
            setSuccess("تم إنشاء مرتجع الشراء");
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ──────────────────────────────────────────
    // Barcode scanner logic (exact POSPage pattern)
    // ──────────────────────────────────────────
    const loadHtml5QrcodeScript = () => new Promise<void>((resolve, reject) => {
        if ((window as any).Html5Qrcode) return resolve();
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });

    const startBarcodeScanner = useCallback(async () => {
        try {
            await loadHtml5QrcodeScript();
            if (!scannerContainerRef.current) return;
            const Html5Qrcode = (window as any).Html5Qrcode;
            const html5QrCode = new Html5Qrcode("barcode-scanner-container-purchase");
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
                (decodedText: string) => {
                    // Try to find product by barcode (sku) first
                    const found = products.find(p => p.sku === decodedText);
                    if (found) {
                        setSelectedProduct(found.id);
                        setUseExistingProduct(true);
                        setError(null);
                    } else {
                        setError(`لم يتم العثور على منتج بالباركود: ${decodedText}`);
                    }
                    setIsScannerOpen(false);
                },
                () => {}
            );
        } catch (err) {
            console.error(err);
            setError("❌ تعذر تشغيل الكاميرا.");
            setIsScannerOpen(false);
        }
    }, [products]);

    const stopBarcodeScanner = useCallback(async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {
                //
            }
            scannerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isScannerOpen) startBarcodeScanner();
        else stopBarcodeScanner();
        return () => { stopBarcodeScanner(); };
    }, [isScannerOpen, startBarcodeScanner, stopBarcodeScanner]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="font-sans" dir="rtl">
            {/* Notifications */}
            {error && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    {success}
                </div>
            )}

            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="text-blue-600 w-6 h-6" />
                        المشتريات
                    </h2>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setTab("create")} className={`px-6 py-2.5 rounded-lg text-sm font-bold ${tab === "create" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}>
                        فاتورة جديدة
                    </button>
                    <button onClick={() => setTab("pending")} className={`px-6 py-2.5 rounded-lg text-sm font-bold ${tab === "pending" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}>
                        قيد الانتظار
                    </button>
                    <button onClick={() => setTab("payables")} className={`px-6 py-2.5 rounded-lg text-sm font-bold ${tab === "payables" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}>
                        الحسابات الدائنة
                    </button>
                </div>
            </div>

            {/* CREATE TAB */}
            {tab === "create" && (
                <form onSubmit={handleCreate}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Supplier selection */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-800 text-sm">بيانات المورد</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={!useNewSupplier}
                                                onChange={() => setUseNewSupplier(false)}
                                                className="accent-blue-600"
                                            />
                                            <span className="text-sm font-medium">مورد موجود</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={useNewSupplier}
                                                onChange={() => setUseNewSupplier(true)}
                                                className="accent-blue-600"
                                            />
                                            <span className="text-sm font-medium">مورد جديد</span>
                                        </label>
                                    </div>

                                    {useNewSupplier ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                placeholder="اسم المورد الجديد"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                value={newSupplierName}
                                                onChange={e => setNewSupplierName(e.target.value)}
                                            />
                                            <input
                                                type="tel"
                                                placeholder="رقم الهاتف"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                value={newSupplierPhone}
                                                onChange={e => setNewSupplierPhone(e.target.value)}
                                                dir="ltr"
                                            />
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                            value={supplierId}
                                            onChange={e => setSupplierId(e.target.value)}
                                        >
                                            <option value="">-- يرجى الاختيار --</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} {s.phone ? `(${s.phone})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Add Item */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 text-sm">إضافة منتج للفاتورة</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsScannerOpen(true)}
                                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        title="مسح باركود"
                                    >
                                        <ScanLine className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>
                                <div className="p-5">
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setUseExistingProduct(true)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium ${useExistingProduct ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            منتج موجود
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUseExistingProduct(false)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium ${!useExistingProduct ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            منتج جديد
                                        </button>
                                    </div>

                                    {useExistingProduct ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">المنتج</label>
                                                <select
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={selectedProduct}
                                                    onChange={e => setSelectedProduct(e.target.value)}
                                                >
                                                    <option value="">اختر المنتج</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} (المخزون: {p.stock_quantity})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الكمية المستلمة</label>
                                                <input
                                                    type="number" min="1" placeholder="10"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={buyQty} onChange={e => setBuyQty(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">سعر الشراء (ج.م)</label>
                                                <input
                                                    type="number" min="0" step="0.01" placeholder="1500"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم المنتج الجديد <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text" placeholder="مثال: شاشة سامسونج"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={newProductName} onChange={e => setNewProductName(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم التصنيف (اختياري)</label>
                                                <input
                                                    type="text" placeholder="إلكترونيات"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">سعر البيع (كاش) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="number" min="0" step="0.01" placeholder="2000"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={cashPrice} onChange={e => setCashPrice(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">سعر البيع (تقسيط)</label>
                                                <input
                                                    type="number" min="0" step="0.01" placeholder="2500"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={installmentPrice} onChange={e => setInstallmentPrice(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الكمية المستلمة</label>
                                                <input
                                                    type="number" min="1"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={buyQty} onChange={e => setBuyQty(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">سعر الشراء (ج.م)</label>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                                    value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <SubmitButton
                                        type="button"
                                        label="إدراج في الفاتورة"
                                        icon={<Plus className="w-4 h-4" />}
                                        disabled={(!useExistingProduct && !newProductName) || !buyQty || !buyPrice || !cashPrice}
                                        onClick={addItem}
                                        className="mt-4 w-full"
                                    />
                                </div>
                            </div>

                            {/* Cart */}
                            {cart.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                        <h3 className="font-bold text-gray-800 text-sm">المنتجات المضافة</h3>
                                        <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{cart.length}</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-800">
                                                        {item.product_name || products.find(p => p.id === item.product_id)?.name || 'منتج'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">{item.quantity} وحدة × {item.buy_price.toLocaleString()} ج.م</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-800">{(item.quantity * item.buy_price).toLocaleString()} ج.م</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="w-8 h-8 bg-red-50 text-red-500 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-500" /> ملاحظات الفاتورة
                                    </h3>
                                </div>
                                <div className="p-5">
                                    <textarea
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 min-h-[80px]"
                                        placeholder="أي ملاحظات..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm sticky top-6 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600" /> الإجمالي النهائي
                                    </h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">عدد الأصناف</span>
                                        <span className="font-bold">{cart.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">إجمالي الوحدات</span>
                                        <span className="font-bold">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-100 pt-4 mt-4">
                                        <span className="text-gray-600 font-bold">الإجمالي المستحق</span>
                                        <span className="text-xl font-black text-blue-600">{cartTotal.toLocaleString()} ج.م</span>
                                    </div>
                                    {cart.length === 0 && (
                                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            يرجى إضافة منتج واحد على الأقل.
                                        </div>
                                    )}
                                    <SubmitButton
                                        label="تأكيد وحفظ الفاتورة"
                                        icon={<ShoppingCart className="w-4 h-4" />}
                                        loading={actionLoading}
                                        disabled={cart.length === 0}
                                        className="w-full mt-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* PENDING TAB */}
            {tab === "pending" && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3">المورد</th>
                                <th className="p-3">الإجمالي</th>
                                <th className="p-3">الحالة</th>
                                <th className="p-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allPurchases.filter(inv => inv.status === 'PENDING').map(inv => (
                                <tr key={inv.id}>
                                    <td className="p-3">{inv.supplier?.name}</td>
                                    <td className="p-3">{inv.total_amount.toLocaleString()} ج.م</td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">معلق</span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <SubmitButton
                                            label="اعتماد"
                                            variant="success"
                                            icon={<CheckCircle2 className="w-4 h-4" />}
                                            loading={actionLoading}
                                            onClick={() => handleApprove(inv.id)}
                                        />
                                        <SubmitButton
                                            label="رفض"
                                            variant="danger"
                                            icon={<XCircle className="w-4 h-4" />}
                                            loading={actionLoading}
                                            onClick={() => handleReject(inv.id)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PAYABLES TAB */}
            {tab === "payables" && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3">المورد</th>
                                <th className="p-3">المتبقي</th>
                                <th className="p-3">رقم الفاتورة</th>
                                <th className="p-3">دفعة</th>
                                <th className="p-3">مرتجع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allPurchases.filter(inv => inv.status === 'APPROVED' && inv.outstanding_amount > 0).map(inv => (
                                <tr key={inv.id}>
                                    <td className="p-3">{inv.supplier?.name}</td>
                                    <td className="p-3 font-bold">{inv.outstanding_amount.toLocaleString()} ج.م</td>
                                    <td className="p-3 font-mono text-xs">{inv.id.slice(0, 8)}</td>
                                    <td className="p-3">
                                        <SubmitButton
                                            label="دفع"
                                            icon={<Banknote className="w-4 h-4" />}
                                            loading={actionLoading}
                                            onClick={() => openPayModal(inv)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <SubmitButton
                                            label="إرجاع"
                                            variant="warning"
                                            icon={<PackageOpen className="w-4 h-4" />}
                                            loading={actionLoading}
                                            onClick={() => openReturnModal(inv)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payment Modal */}
            {payModalOpen && payingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">تسديد دفعة</h3>
                            <button onClick={() => setPayModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">الفاتورة: {payingInvoice.id.slice(0, 8)} – المتبقي: {payingInvoice.outstanding_amount} ج.م</p>
                        <input
                            type="number"
                            className="w-full p-3 border rounded-xl mb-2"
                            value={payAmount}
                            onChange={e => setPayAmount(Number(e.target.value))}
                        />
                        <select className="w-full p-3 border rounded-xl mb-4" value={payVaultId} onChange={e => setPayVaultId(e.target.value)}>
                            <option value="">اختر الخزينة</option>
                            {vaults.map(v => <option key={v.id} value={v.id}>{v.name} ({v.balance})</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => setPayModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold">إلغاء</button>
                            <SubmitButton
                                label="تأكيد الدفع"
                                loading={actionLoading}
                                onClick={handlePay}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {returnModalOpen && returningInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">مرتجع شراء</h3>
                            <button onClick={() => setReturnModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-2">
                            {returnItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <span className="flex-1 text-sm">{item.product_name}</span>
                                    <span className="text-xs text-gray-500">(الحد الأقصى: {item.maxQty})</span>
                                    <input
                                        type="number"
                                        min={0}
                                        max={item.maxQty}
                                        className="w-20 p-2 border rounded"
                                        value={item.returnQty}
                                        onChange={e => {
                                            const newItems = [...returnItems];
                                            newItems[idx].returnQty = Number(e.target.value);
                                            setReturnItems(newItems);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <SubmitButton
                            label="تأكيد الإرجاع"
                            variant="warning"
                            loading={actionLoading}
                            onClick={handleReturn}
                            className="mt-4 w-full"
                        />
                    </div>
                </div>
            )}

            {/* Barcode Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
                        <div className="p-4 flex justify-between items-center bg-gray-50 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">📷 ماسح الباركود</h3>
                            <button onClick={() => setIsScannerOpen(false)} className="bg-red-50 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                        </div>
                        <div id="barcode-scanner-container-purchase" ref={scannerContainerRef} className="w-full h-80 bg-black relative" />
                        <div className="p-4 text-center bg-gray-50"><span className="text-xs font-medium text-gray-500">يرجى توجيه الكاميرا نحو رمز المنتج</span></div>
                    </div>
                </div>
            )}
        </div>
    );
}
import { useState, useEffect } from "react"
import { inventoryAPI, type ProductRecord, type CategoryRecord } from "@/services/api"
import { Package, Tags, Search, Image as ImageIcon, AlertCircle, ShoppingCart, Truck } from "lucide-react"
import SuppliersPage from "@/pages/SuppliersPage"
import PurchasesPage from "@/pages/PurchasesPage"

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'suppliers' | 'purchases'>('products')
    const [products, setProducts] = useState<ProductRecord[]>([])
    const [categories, setCategories] = useState<CategoryRecord[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [prodRes, catRes] = await Promise.all([
                inventoryAPI.listProducts(),
                inventoryAPI.listCategories(),
            ])
            setProducts(prodRes.data.products || [])
            setCategories(catRes.data.categories || [])
        } catch (error) {
            console.error("Failed to load inventory:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.includes(searchQuery))
    )

    const filteredCategories = categories.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Package className="text-blue-600" />
                        إدارة المخزون والمنتجات
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        مراقبة المنتجات والكميات والأسعار. لا يمكن إضافة منتجات جديدة من هنا — يتم إضافتها عبر فاتورة الشراء.
                    </p>
                </div>
            </div>

            {activeTab === 'suppliers' ? (
                <SuppliersPage />
            ) : activeTab === 'purchases' ? (
                <PurchasesPage />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between gap-4 items-center">
                        <div className="flex bg-gray-200/50 p-1 rounded-lg w-full md:w-auto overflow-x-auto border border-gray-200">
                            <button onClick={() => setActiveTab('products')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                📦 المنتجات ({products.length})
                            </button>
                            <button onClick={() => setActiveTab('categories')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                🏷️ التصنيفات ({categories.length})
                            </button>
                        </div>

                        {activeTab !== 'categories' && (
                            <div className="relative w-full md:w-80">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="بحث بالاسم أو الباركود..."
                                    className="w-full pl-4 pr-10 p-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all text-sm font-medium bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto custom-scroll">
                        {activeTab === 'products' ? (
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm font-semibold">
                                    <tr>
                                        <th className="p-4">المنتج</th>
                                        <th className="p-4">الكود (SKU)</th>
                                        <th className="p-4">التصنيف</th>
                                        <th className="p-4">سعر التكلفة</th>
                                        <th className="p-4">السعر (كاش)</th>
                                        <th className="p-4">الكمية</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-gray-400 animate-pulse">جاري تحميل المخزون...</td></tr>
                                    ) : filteredProducts.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-gray-500">لا توجد منتجات مطابقة</td></tr>
                                    ) : (
                                        filteredProducts.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        <ImageIcon className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <span className="font-medium group-hover:text-blue-600 transition-colors">{p.name}</span>
                                                </td>
                                                <td className="p-4 text-gray-500 font-mono text-xs" dir="ltr">{p.sku || '—'}</td>
                                                <td className="p-4">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs border border-gray-200">{p.category_name || '—'}</span>
                                                </td>
                                                <td className="p-4 text-gray-500 font-medium">{Number(p.cost_price).toLocaleString()} ج.م</td>
                                                <td className="p-4 text-blue-600 font-medium">{Number(p.cash_price).toLocaleString()} ج.م</td>
                                                <td className="p-4">
                                                    {p.stock_quantity <= 5 ? (
                                                        <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-1 rounded-full text-xs font-bold w-max">
                                                            <AlertCircle className="w-3.5 h-3.5" /> {p.stock_quantity}
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-700 bg-emerald-100 px-3 py-1 text-xs font-bold rounded-full">{p.stock_quantity}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-right animate-in fade-in">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm font-semibold">
                                    <tr>
                                        <th className="p-4">اسم التصنيف</th>
                                        <th className="p-4">الوصف</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                                    {isLoading ? (
                                        <tr><td colSpan={2} className="text-center py-12 text-gray-400 animate-pulse">جاري التحميل...</td></tr>
                                    ) : filteredCategories.length === 0 ? (
                                        <tr><td colSpan={2} className="text-center py-12 text-gray-500">لا توجد تصنيفات مسجلة</td></tr>
                                    ) : (
                                        filteredCategories.map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 flex items-center gap-2 font-medium">
                                                    <Tags className="w-4 h-4 text-blue-500" /> {c.name}
                                                </td>
                                                <td className="p-4 text-gray-500">{c.description || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
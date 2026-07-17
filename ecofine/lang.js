/**
 * 🌐 i18n.js - نظام الترجمة متعدد اللغات (Multi-Language Support)
 * Eco Fine Pro V14.0 | Techno Vision Solutions
 * يدعم: العربية، الإنجليزية، الفرنسية
 */

(function() {
    "use strict";

    // ==========================================
    // التكوين الأساسي
    // ==========================================
    const SUPPORTED_LANGUAGES = ['ar', 'en', 'fr'];
    const DEFAULT_LANGUAGE = 'ar';
    const STORAGE_KEY = 'ecofine_language_preference';

    // ==========================================
    ///📚 قاموس الترجمة الكامل (يتم تحميله من ملفات JSON)
    // ==========================================
    let translations = {
        ar: {},
        en: {},
        fr: {}
    };

    let currentLanguage = DEFAULT_LANGUAGE;
    let isInitialized = false;

    // ==========================================
    // 🔧 تهيئة النظام
    // ==========================================
    const init = async () => {
        if (isInitialized) return true;

        try {
            // استرجاع اللغة المفضلة من التخزين المحلي
            const savedLang = localStorage.getItem(STORAGE_KEY);
            if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
                currentLanguage = savedLang;
            } else {
                // استخدام لغة المتصفح إذا كانت مدعومة
                const browserLang = navigator.language?.toLowerCase().substring(0, 2) || DEFAULT_LANGUAGE;
                if (SUPPORTEDED_LANGUAGES.includes(browserLang)) {
                    currentLanguage = browserLang;
                }
            }

            // تحميل ملفات الترجمة بشكل متوازي
            await Promise.all([
                loadTranslations('ar'),
                loadTranslations('en'),
                loadTranslations('fr')
            ]);

            isInitialized = true;
            console.log(`✅ نظام الترجمة مُهيأ - اللغة الحالية: ${currentLanguage.toUpperCase()}`);
            
            // تحديث اتجاه الصفحة
            updateDocumentDirection();
            return true;
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام الترجمة:', error);
            return false;
        }
    };

    // ==========================================
    // 📥 تحميل ملفات الترجمة من CDN
    // ==========================================
    const loadTranslations = async (langCode) => {
        try {
            const response = await fetch(`locales/${langCode}.json`);
            if (!response.ok) throw new Error(`فشل تحميل ملف ${langCode}`);
            
            translations[langCode] = await response.json();
            console.log(`✅ تم تحميل الترجمة: ${langCode.toUpperCase()}`);
        } catch (error) {
            console.warn(`⚠️ فشل تحميل ملفات الترجمة لـ ${langCode}:`, error);
            // استخدام كائن فارغ إذا فشل التحميل
            translations[langCode] = {};
        }
    };

    // ==========================================
    // 🎯 دالة الترجمة الرئيسية
    // ==========================================
    const t = (key, params = {}) => {
        if (!isInitialized) return key;

        // البحث في اللغة الحالية أولاً
        let value = getNestedValue(translations[currentLanguage], key);
        
        // إذا لم توجد، حاول من الإنجليزية كـ fallback
        if (!value && currentLanguage !== 'en') {
            value = getNestedValue(translations['en'], key);
        }

        // استبدال المتغيرات في النص
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            value = value.replace(/\{(\w+)\}/g, (match, paramName) => {
                return params[paramName] !== undefined ? params[paramName] : match;
            });
        }

        // إذا لم توجد ترجمة، استخدم المفتاح نفسه
        return value || key;
    };

    // ==========================================
    // 🔍 البحث في كائن الترجمة (دعم المسارات)
    // ==========================================
    const getNestedValue = (obj, path) => {
        if (!obj || !path) return undefined;
        
        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }

        return value;
    };

    // ==========================================
    // 🌍 تغيير اللغة ديناميكياً
    // ==========================================
    const setLanguage = async (langCode) => {
        if (!SUPPORTEDED_LANGUAGES.includes(langCode)) {
            console.error(`❌ اللغة ${langCode} غير مدعومة`);
            return false;
        }

        try {
            // تحميل اللغة إذا لم تكن محملة مسبقاً
            if (Object.keys(translations[langCode]).length === 0) {
                await loadTranslations(langCode);
            }

            currentLanguage = langCode;
            localStorage.setItem(STORAGE_KEY, langCode);
            
            // تحديث اتجاه الصفحة
            updateDocumentDirection();
            
            // إعادة تحميل العناصر المترجمة في DOM
            refreshTranslatableElements();
            
            console.log(`✅ تم تغيير اللغة إلى: ${langCode.toUpperCase()}`);
            return true;
        } catch (error) {
            console.error('❌ خطأ في تغيير اللغة:', error);
            return false;
        }
    };

    // ==========================================
    // 📐 تحديث اتجاه الصفحة بناءً على اللغة
    // ==========================================
    const updateDocumentDirection = () => {
        const html = document.documentElement;
        
        if (currentLanguage === 'ar') {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', 'ar');
        } else {
            html.setAttribute('dir', 'ltr');
            html.setAttribute('lang', currentLanguage);
        }
    };

    // ==========================================
    // 🔄 تحديث العناصر المترجمة في الصفحة
    // ==========================================
    const refreshTranslatableElements = () => {
        // البحث عن جميع العناصر التي تحتوي على data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                const translatedText = t(key);
                
                // تحديث النص حسب نوع العنصر
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    if (element.placeholder) {
                        element.placeholder = translatedText;
                    } else {
                        element.value = translatedText;
                    }
                } else if (element.tagName === 'BUTTON' && !element.innerHTML.includes('<')) {
                    element.textContent = translatedText;
                } else {
                    element.textContent = translatedText;
                }
            }
        });

        // تحديث نصوص HTML الثابتة التي تحتوي على مفاتيح ترجمة مباشرة
        updateStaticHTMLContent();
    };

    // ==========================================
    // 📝 تحديث محتوى HTML الثابت
    // ==========================================
    const updateStaticHTMLContent = () => {
        // تحديث عناصر العنوان
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = t(key);
        });

        // تحديث النصوص في النماذج والأزرار
        document.querySelectorAll('[data-i18n-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-label');
            if (key) el.textContent = t(key);
        });
    };

    // ==========================================
    // 📊 الحصول على قائمة اللغات المدعومة
    // ==========================================
    const getSupportedLanguages = () => {
        return SUPPORTED_LANGUAGES.map(code => ({
            code,
            name: getLanguageName(code)
        }));
    };

    // ==========================================
    // 🏷️ الحصول على اسم اللغة
    // ==========================================
    const getLanguageName = (code) => {
        const names = {
            ar: 'العربية',
            en: 'English',
            fr: 'Français'
        };
        return names[code] || code;
    };

    // ==========================================
    // 🎨 واجهة مستخدم لاختيار اللغة (مكون React)
    // ==========================================
    const LanguageSelector = ({ current, onChange }) => {
        const [isOpen, setIsOpen] = React.useState(false);

        return React.createElement('div', { className: 'relative' },
            React.createElement('button', {
                onClick: () => setIsOpen(!isOpen),
                className: 'flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-xs font-black shadow-sm active:scale-95'
            },
                React.createElement('span', null, getLanguageIcon(current)),
                ' ',
                React.createElement('span', null, getLanguageName(current))
            ),

            isOpen && React.createElement('div', {
                onClick: () => setIsOpen(false),
                className: 'fixed inset-0 z-[99]'
            }),

            isOpen && React.createElement('div', {
                className: 'absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-2 min-w-[150px] z-[100]',
                onClick: (e) => e.stopPropagation()
            },
                SUPPORTED_LANGUAGES.map(code => 
                    React.createElement('button', {
                        key: code,
                        onClick: () => { onChange(code); setIsOpen(false); },
                        className: `w-full px-4 py-2 text-right hover:bg-slate-50 flex items-center gap-3 transition-colors ${current === code ? 'bg-blue-50' : ''}`
                    },
                        React.createElement('span', null, getLanguageIcon(code)),
                        React.createElement('span', { className: current === code ? 'text-blue-600 font-black' : 'text-slate-700 font-bold' }, getLanguageName(code))
                    )
                ),

                React.createElement('div', {
                    key: 'current',
                    className: `px-4 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 mt-1`
                }, 'Current:', current.toUpperCase())
            )
        );
    };

    // ==========================================
    // 🗺️ أيقونة اللغة
    // ==========================================
    const getLanguageIcon = (code) => {
        return code === 'ar' ? '🇸🇦' : code === 'en' ? '🇬🇧' : '🇫🇷';
    };

    // ==========================================
    // 📊 إحصائيات النظام
    // ==========================================
    const getStats = () => {
        return {
            currentLanguage,
            isInitialized,
            supportedLanguages: SUPPORTED_LANGUAGES.length,
            loadedKeys: {
                ar: Object.keys(translations.ar).length,
                en: Object.keys(translations.en).length,
                fr: Object.keys(translations.fr).length
            }
        };
    };

    // ==========================================
    // 🚀 التعريفات العامة
    // ==========================================
    window.XI18n = {
        init,
        t,
        setLanguage,
        getLanguage: () => currentLanguage,
        getCurrentLanguageName: () => getLanguageName(currentLanguage),
        getSupportedLanguages,
        getStats,
        LanguageSelector,
        refreshTranslatableElements,
        
        // اختصارات
        lang: (key, params) => t(key, params),
    };

})();

/**
 * 🎬 Splash Screen Embed for EcoFin Pro V15
 * دمج شاشة السبلاش في الواجهة الرئيسية
 */

// ✅ سيتم استدعاء هذا الملف من index.html بعد تحميل React
window.EcoFineSplashData = {
    // أنيميشن الانترو
    introAnimation: {
        duration: 8000, // 8 ثواني
        sequence: [
            { text: "Welcome to EcoFin", delay: 1500 },
            { text: "Enterprise Credit System", delay: 3500 },
            { text: "Powered by Techno Vision Solutions", delay: 5500 }
        ]
    },
    
    // تصميم شاشة السبلاش
    design: {
        gradientStart: '#0D1B2A',
        gradientEnd: '#1B263B',
        accentColor: '#2563EB'
    },
    
    // حالة التفعيل
    activationStatus: null // سيتم تعبئتها من localStorage
};

// ✅ دالة تخطي الانترو يدوياً
window.skipIntro = function() {
    const iframe = document.getElementById('splash-frame');
    if (iframe) {
        iframe.classList.add('is-hidden');
        setTimeout(() => iframe.remove(), 500);
        
        // إتمام التطبيق
        if (window.EcoFineSplash) {
            window.EcoFineSplash.markAppReady();
        }
    }
};

// ✅ رسالة للتطبيق الرئيسي ليعرف أن السبلاش جاهز
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('load', function() {
        console.log('%c🎬 EcoFin Splash Screen Loaded - Ready for App Initiation', 'color: #2563EB; font-weight: bold;');
    });
}
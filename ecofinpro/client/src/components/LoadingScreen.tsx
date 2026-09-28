interface LoadingScreenProps {
    error?: string | null;
}

export default function LoadingScreen({ error }: LoadingScreenProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden" dir="rtl">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            {/* Animated X Logo */}
            <div className="w-20 h-20 mb-8 relative">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xl">X</div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2">
            Eco Fine <span className="text-blue-500">Pro</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse mb-4">
            Initializing System...
            </p>
            
            {/* Error State */}
            {error && (
            <div className="mt-6 max-w-sm bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-center animate-in zoom-in duration-300">
                <p className="text-xs text-red-300 font-bold leading-relaxed">{error}</p>
            </div>
            )}
        </div>
        </div>
    );
}
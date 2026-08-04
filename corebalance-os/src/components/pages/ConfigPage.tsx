import React from 'react';
import { Card } from '../ui/Card';
import { Settings, Database, Shield, RefreshCw } from 'lucide-react';

export const ConfigPage: React.FC = () => {
  return (
    <div className="space-y-6 text-right">
      <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
        <Settings className="w-6 h-6 text-indigo-400" />
        إعدادات النظام
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3 text-indigo-400 font-semibold">
            <Database className="w-5 h-5" />
            <span>إدارة قاعدة البيانات المحلية (Dexie.js)</span>
          </div>
          <p className="text-sm text-slate-400">جميع البيانات يتم تخزينها مشفرة ومحلياً على جهازك.</p>
          <button className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition">
            نسخ احتياطي للبيانات
          </button>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3 text-emerald-400 font-semibold">
            <Shield className="w-5 h-5" />
            <span>حالة النظام والوصول</span>
          </div>
          <p className="text-sm text-slate-400">وضع العمل الحر والجاهزية التشغيلية نشط.</p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
            <RefreshCw className="w-4 h-4 animate-spin" />
            مُزامن مع ذاكرة الجهاز المحلية
          </div>
        </Card>
      </div>
    </div>
  );
};
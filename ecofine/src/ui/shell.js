(function () {
  'use strict';

  window.EcoFine = window.EcoFine || {};
  window.EcoFine.ui = window.EcoFine.ui || {};

  window.EcoFine.ui.renderShell = function renderShell() {
    const root = document.getElementById('root');
    if (!root) return false;

    root.innerHTML = `
      <div style="font-family:Tahoma,Arial,sans-serif; padding:24px; background:#f8fafc; min-height:100vh; color:#0f172a;">
        <h1 style="font-size:24px; font-weight:800; margin-bottom:8px;">Eco Fine Pro</h1>
        <p style="margin:0 0 16px; color:#64748b;">النظام جاهز - تم تنظيم الهيكل الأساسي بنجاح</p>
        <div style="background:white; border:1px solid #e2e8f0; padding:16px; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.04);">
          <strong>الحالة:</strong> ${window.EcoFine?.services?.app?.getSystemStatus?.().healthy ? 'مُشغّل' : 'غير جاهز'}
        </div>
        <div style="margin-top:16px; display:flex; flex-wrap:wrap; gap:12px;">
          <a href="attendance.html" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; padding:12px 16px; background:#2563eb; color:white; border-radius:999px; text-decoration:none; font-weight:700; box-shadow:0 8px 20px rgba(37,99,235,0.2);">
            📝 نموذج تسجيل الحضور
          </a>
        </div>
      </div>
    `;
    return true;
  };
})();

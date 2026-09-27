(function () {
  'use strict';

  window.EcoFine = window.EcoFine || {};
  window.EcoFine.ui = window.EcoFine.ui || {};

  window.EcoFine.ui.renderShell = function renderShell() {
    const root = document.getElementById('root');
    if (!root) return false;

    root.innerHTML = '';
    return true;
  };
})();

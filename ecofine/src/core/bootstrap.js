(function () {
  'use strict';

  window.EcoFine = window.EcoFine || {};
  window.EcoFine.bootstrap = {
    version: '14.1',
    startedAt: new Date().toISOString(),
    environment: (window.location.hostname === 'localhost' ? 'development' : 'production'),
    init: function init() {
      window.EcoFine.ready = true;
      window.dispatchEvent(new CustomEvent('ecofine:ready'));
      return true;
    }
  };

  if (window.EcoFine.bootstrap.init) {
    window.EcoFine.bootstrap.init();
  }
})();

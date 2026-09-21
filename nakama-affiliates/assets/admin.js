(() => {
  'use strict';

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-nakama-confirm]');
    if (!trigger) return;
    const message = trigger.getAttribute('data-nakama-confirm');
    if (message && !window.confirm(message)) event.preventDefault();
  });
})();

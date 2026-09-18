(function ($) {
  'use strict';

  function syncCapacity() {
    var unlimited = $('[data-drop-unlimited]').is(':checked');
    $('[data-drop-capacity]').prop('hidden', unlimited);
    $('[data-drop-capacity] input').prop('required', !unlimited);
  }

  $(function () {
    syncCapacity();
    $('[data-drop-unlimited]').on('change', syncCapacity);
    $('[data-drop-apply]').on('click', function () {
      $('[data-drop-presale]').val($('[data-drop-general-presale]').val());
      $('[data-drop-launch]').val($('[data-drop-general-launch]').val());
    });
  });
})(jQuery);


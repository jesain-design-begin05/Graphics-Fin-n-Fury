/* ================================================================
   stagemap.js  —  Stage Map Modal logic for Fin & Fury
================================================================= */

(function () {

  /* ── Stage colour palette matches CSS .ms-N vars ─────────── */
  var STAGE_COLORS = {
    1: '#4FC3F7',   // kelp forests   — ocean blue
    2: '#5C6BC0',   // abyssal chasm  — indigo
    3: '#EF5350',   // kraken's lair  — crimson
    4: '#AB47BC',   // sunken atlantis— purple
    5: '#FF7043',   // bubbling volc. — deep orange
  };

  /* ── Open / Close ─────────────────────────────────────── */
  function openStageMap() {
    var m = document.getElementById('stageMapModal');
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
  }

  function closeStageMap() {
    var m = document.getElementById('stageMapModal');
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }

  /* ── Start a stage (delegates to MenuSystem) ──────────── */
  function startStageFromMap(stageNum) {
    closeStageMap();
    if (window.menuSystem) {
      window.menuSystem._startGame(stageNum);
    }
  }

  /* ── Expose globals so inline onclick="" still works ──── */
  window.openStageMap      = openStageMap;
  window.closeStageMap     = closeStageMap;
  window.startStageFromMap = startStageFromMap;

  /* ── Boot on DOM ready ────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {

    /* Close on X button */
    document.getElementById('closeStageMap')
      .addEventListener('click', closeStageMap);

    /* Close on backdrop click */
    document.getElementById('stageMapModal')
      .addEventListener('click', function (e) {
        if (e.target === this) closeStageMap();
      });

    /* ── Spawn floating bubbles inside the map ─────────── */
    var bc = document.getElementById('mapBubbles');
    for (var i = 0; i < 18; i++) {
      var b  = document.createElement('div');
      b.className = 'map-bubble';
      var s  = 3 + Math.random() * 8;
      b.style.cssText =
        'width:'  + s + 'px;' +
        'height:' + s + 'px;' +
        'left:'   + (Math.random() * 100) + '%;' +
        'bottom:-16px;' +
        'animation-duration:'  + (7  + Math.random() * 13) + 's;' +
        'animation-delay:'     + (Math.random() * 14)      + 's;';
      bc.appendChild(b);
    }

    /* ── Stage button wiring ────────────────────────────── */
    var btns = document.querySelectorAll('.map-stage-btn');

    btns.forEach(function (btn) {
      var stageNum = parseInt(btn.getAttribute('data-stage'), 10);
      var color    = STAGE_COLORS[stageNum] || '#90CAF9';

      /* Apply colour as CSS custom property */
      btn.style.setProperty('--stage-color', color);
      var circleEl = btn.querySelector('.stage-circle');
      if (circleEl) circleEl.style.setProperty('--stage-color', color);

      /* Hover / focus state toggle */
      function addHover()    { btn.classList.add('hovered');    }
      function removeHover() { btn.classList.remove('hovered'); }

      btn.addEventListener('mouseenter', addHover);
      btn.addEventListener('mouseleave', removeHover);
      btn.addEventListener('focus',      addHover);
      btn.addEventListener('blur',       removeHover);
    });
  });

})();
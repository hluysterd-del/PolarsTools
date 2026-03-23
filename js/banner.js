(function () {
  var banner = document.createElement('div');
  banner.className = 'warning-banner';
  banner.innerHTML = '\u26A0\uFE0F GRAB is trying to take down our website \uD83E\uDD40' +
    '<button class="close-btn" aria-label="Close banner">\u00D7</button>';

  document.body.insertBefore(banner, document.body.firstChild);
  document.body.classList.add('has-banner');

  banner.querySelector('.close-btn').addEventListener('click', function () {
    banner.remove();
    document.body.classList.remove('has-banner');
  });
})();

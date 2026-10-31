/* Small clock in the header showing the time in Berlin. */
(function () {
  var el = document.querySelector(".site-header .clock");
  if (!el || !window.Intl) return;
  var fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
  function tick() { el.textContent = "berlin " + fmt.format(new Date()); }
  tick();
  setInterval(tick, 1000);
})();

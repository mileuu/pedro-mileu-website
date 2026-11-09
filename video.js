/* Click-to-play YouTube videos.
   Each <div class="video yt" data-id="..."> shows a still with a play button;
   pressing it swaps in the real player and starts it straight away. */
(function () {
  document.querySelectorAll(".yt").forEach(function (box) {
    var btn = box.querySelector(".yt-play");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + box.dataset.id +
              "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      f.title = box.dataset.title || "Video";
      f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      f.allowFullscreen = true;
      box.replaceChildren(f);
      box.classList.add("is-playing");
    });
  });
})();

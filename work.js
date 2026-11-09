/* Work pages:
   - click-to-play YouTube videos: each <div class="video yt" data-id="...">
     shows a still with a play button; pressing it swaps in the real player
     and starts it straight away.
   - photos in .thumbs open large in the .lightbox; click or Esc closes. */
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

  var box = document.querySelector(".lightbox");
  if (!box || !box.showModal) return; // no dialog support: links just open the photo
  var big = box.querySelector("img");
  document.querySelectorAll(".thumbs a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var small = a.querySelector("img");
      big.src = a.href;
      big.alt = small ? small.alt : "";
      box.showModal();
    });
  });
  box.addEventListener("click", function () { box.close(); });
})();

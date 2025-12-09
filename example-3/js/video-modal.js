"use strict";

(function () {
  var MODAL_ID = "video-modal";
  var VIDEO_ID = "video-modal-el";
  var VIDEO_SRC = "./videos/community.mp4";
  var POSTER_SRC = "./images/demo-video-poster.png";

  function canPlay(type) {
    try {
      var video = document.createElement("video");
      if (!video || typeof video.canPlayType !== "function") return false;
      var result = video.canPlayType(type);
      return result === "probably" || result === "maybe";
    } catch (error) {
      return false;
    }
  }

  function getSources() {
    var canPlayMp4 =
      canPlay('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') || canPlay("video/mp4");
    return canPlayMp4
      ? [
          {
            src: VIDEO_SRC,
            type: "video/mp4",
          },
        ]
      : [];
  }

  function hydrateVideo(videoEl) {
    while (videoEl.firstChild) {
      videoEl.removeChild(videoEl.firstChild);
    }

    videoEl.setAttribute("poster", POSTER_SRC);

    getSources().forEach(function (source) {
      var sourceEl = document.createElement("source");
      sourceEl.src = source.src;
      sourceEl.type = source.type;
      videoEl.appendChild(sourceEl);
    });

    try {
      videoEl.load();
    } catch (error) {
      // ignore load issues so the modal can still open
    }
  }

  function openModal() {
    var modal = document.getElementById(MODAL_ID);
    var video = document.getElementById(VIDEO_ID);
    if (!modal || !video) return;

    hydrateVideo(video);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    try {
      video.play().catch(function () {});
    } catch (error) {
      // ignore play errors (e.g. autoplay restrictions)
    }

    document.documentElement.style.overflow = "hidden";
  }

  function closeModal() {
    var modal = document.getElementById(MODAL_ID);
    var video = document.getElementById(VIDEO_ID);
    if (!modal || !video) return;

    try {
      video.pause();
    } catch (error) {
      // ignore pause errors
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target) return;

    if (target.closest("#video-demo, .video-demo, [data-video-demo]")) {
      event.preventDefault();
      openModal();
      return;
    }

    if (target.closest("[data-video-close]")) {
      event.preventDefault();
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    var modal = document.getElementById(MODAL_ID);
    if (modal && modal.classList.contains("is-open")) {
      event.preventDefault();
      closeModal();
    }
  });
})();

// Valmozzola page: accessible lightbox for the photo gallery (keyboard, swipe, prev/next)
(function () {
  const lb = document.getElementById("vlb"); if (!lb) return;
  const items = [...document.querySelectorAll(".vg-grid .vg-open")];
  const img = lb.querySelector("img"), cap = lb.querySelector("figcaption");
  let cur = -1, last = null;
  function show(i) {
    cur = (i + items.length) % items.length;
    const b = items[cur], fig = b.closest("figure");
    img.src = b.dataset.full; img.alt = b.querySelector("img").alt;
    img.width = +b.dataset.w; img.height = +b.dataset.h;
    cap.innerHTML = fig.querySelector("figcaption").innerHTML + `<span class="vlb-c">${cur + 1} / ${items.length}</span>`;
  }
  function open(i) { last = document.activeElement; lb.hidden = false; document.body.classList.add("vlb-on"); show(i); lb.querySelector(".vlb-x").focus(); }
  function close() { lb.hidden = true; document.body.classList.remove("vlb-on"); img.removeAttribute("src"); if (last) last.focus(); }
  items.forEach((b, i) => b.addEventListener("click", () => open(i)));
  document.querySelectorAll(".vp-plq-img").forEach((b) => b.addEventListener("click", () => { const k = items.findIndex((x) => x.dataset.full.includes("wwi-memorial-plaque")); open(k < 0 ? 0 : k); }));
  lb.querySelector(".vlb-x").onclick = close;
  lb.querySelector(".vlb-p").onclick = () => show(cur - 1);
  lb.querySelector(".vlb-n").onclick = () => show(cur + 1);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") show(cur - 1); else if (e.key === "ArrowRight") show(cur + 1); else if (e.key === "Tab") { const f = [...lb.querySelectorAll("button, a[href]")]; const k = f.indexOf(document.activeElement); if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
})();

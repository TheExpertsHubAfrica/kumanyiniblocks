function setupGalleryFilters() {
  const filters = document.querySelectorAll("[data-gallery-filter]");
  const items = document.querySelectorAll(".gallery-item");
  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      filters.forEach((f) => f.classList.remove("is-active"));
      filter.classList.add("is-active");
      const key = filter.dataset.galleryFilter;
      items.forEach((item) => {
        item.style.display = key === "all" || item.dataset.category === key ? "inline-block" : "none";
      });
    });
  });
}

function setupLightbox() {
  const items = [...document.querySelectorAll(".gallery-item")];
  const box = document.querySelector("#lightbox");
  if (!box || !items.length) return;
  const media = box.querySelector(".lightbox-media");
  const caption = box.querySelector(".lightbox-caption");
  let current = 0;
  const openAt = (index) => {
    current = index;
    const item = items[current];
    media.innerHTML = item.innerHTML;
    caption.textContent = item.dataset.caption || "";
    box.classList.add("is-open");
  };
  const close = () => box.classList.remove("is-open");
  const move = (delta) => openAt((current + delta + items.length) % items.length);
  items.forEach((item, index) => item.addEventListener("click", () => openAt(index)));
  box.querySelector(".lightbox-close")?.addEventListener("click", close);
  box.querySelector(".lightbox-prev")?.addEventListener("click", () => move(-1));
  box.querySelector(".lightbox-next")?.addEventListener("click", () => move(1));
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupGalleryFilters();
  setupLightbox();
});

const WHATSAPP_URL = "https://wa.me/233550203197?text=Hello%2C%20I%27d%20like%20to%20enquire%20about%20your%20blocks.";
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzaeFQGWZIirPpWtWLWaLXmM8Y88243I4vm9j_FDhFCkTV9JwfMdcOqlv1CQp_waCXGkA/exec";

async function gasRequest(action, payload = {}) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: false, mock: true };
  try {
    const params = new URLSearchParams();
    params.set("action", action);
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "object") {
        params.set(key, JSON.stringify(value));
      } else {
        params.set(key, String(value));
      }
    });
    const res = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`, {
      method: "GET"
    });
    return await res.json();
  } catch (err) {
    console.error("GAS request failed:", err);
    return { success: false };
  }
}

function updateQuoteBadge() {
  const badge = document.querySelector(".quote-count");
  if (!badge) return;
  const cart = JSON.parse(sessionStorage.getItem("kb_quote_cart") || "[]");
  badge.textContent = cart.length;
}

function setupNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const overlay = document.querySelector(".nav-overlay");
  const nav = document.querySelector(".site-nav");
  if (!links || !overlay || !nav) return;
  const closeDrawer = () => {
    links.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  toggle?.addEventListener("click", () => {
    links.classList.add("is-open");
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  });
  overlay.addEventListener("click", closeDrawer);
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeDrawer));
  window.addEventListener("scroll", () => nav.classList.toggle("is-scrolled", window.scrollY > 60));
}

function setupReveal() {
  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  revealItems.forEach((item) => observer.observe(item));
}

function setupLoader() {
  const loader = document.querySelector(".page-loader");
  if (!loader || sessionStorage.getItem("kb_seen_loader")) {
    loader?.classList.add("is-hidden");
    return;
  }
  setTimeout(() => loader.classList.add("is-hidden"), 1300);
  sessionStorage.setItem("kb_seen_loader", "true");
}

function setupScrollTop() {
  const topBtn = document.querySelector(".scroll-top");
  if (!topBtn) return;
  window.addEventListener("scroll", () => topBtn.classList.toggle("is-visible", window.scrollY > 300));
  topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

async function logVisit() {
  await gasRequest("logVisit", {
    page: document.title,
    userAgent: navigator.userAgent,
    referrer: document.referrer || "direct"
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupReveal();
  setupLoader();
  setupScrollTop();
  updateQuoteBadge();
  logVisit();
});

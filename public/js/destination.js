document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("destination");
  const box   = document.getElementById("destination-suggestions");
  let items   = [], idx = -1, timer;

  function render(list) {
    if (!list.length) {
      box.classList.add("hidden");
      return;
    }
    box.innerHTML = list.map(loc => {
      const code = loc.iataCode ? ` (${loc.iataCode})` : "";
      return `
        <div class="suggestion-item" data-value="${loc.name}${code}">
          <span class="icon"></span>
          <div class="details">
            <div class="name">${loc.name}${code}</div>
            <div class="sub">${loc.region || loc.country}</div>
          </div>
        </div>
      `;
    }).join("");
    box.classList.remove("hidden");
  }

  function clear() {
    items = [];
    idx = -1;
    box.innerHTML = "";
    box.classList.add("hidden");
  }

  async function lookup(q) {
    console.log("lookup:", q);
    try {
      const res = await fetch(`/api/locations?keyword=${encodeURIComponent(q)}`);
      console.log("status:", res.status);
      const data = await res.json();
      console.log("got:", data);
      items = data;
      render(data);
    } catch (err) {
      console.error("fetch error:", err);
      clear();
    }
  }

  input.addEventListener("input", () => {
    const raw = input.value;
    if (!raw) return clear();
    clearTimeout(timer);
    timer = setTimeout(() => lookup(raw), 300);
  });

  box.addEventListener("click", e => {
    const el = e.target.closest(".suggestion-item");
    if (!el) return;
    input.value = el.dataset.value;
    clear();
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".autocomplete")) clear();
  });

  input.addEventListener("keydown", e => {
    const els = box.querySelectorAll(".suggestion-item");
    if (!els.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      idx = (idx + 1) % els.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      idx = (idx + els.length - 1) % els.length;
    } else if (e.key === "Enter" && idx > -1) {
      e.preventDefault();
      els[idx].click();
      return;
    } else {
      return;
    }
    els.forEach((el, i) => el.classList.toggle("active", i === idx));
  });
});
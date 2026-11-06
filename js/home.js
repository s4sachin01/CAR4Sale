import { supabase, isConfigured, money, escapeHtml, waLink, showConfigError, carTitle, carImage } from "./supabase.js";
import { WHATSAPP_NUMBER } from "./config.js";

const grid = document.querySelector("#carGrid");
const featuredSlider = document.querySelector("#featuredSlider");
const searchInput = document.querySelector("#searchInput");
const fuelFilter = document.querySelector("#fuelFilter");
const sortFilter = document.querySelector("#sortFilter");
let allCars = [];
let featuredCars = [];
let featuredIndex = 0;

document.querySelector("#yearNow").textContent = new Date().getFullYear();

function detailUrl(car) { return `car.html?id=${encodeURIComponent(car.id)}`; }

function renderFeatured() {
  const section = document.querySelector("#featuredSection");
  if (!featuredCars.length) { section.hidden = true; return; }
  section.hidden = false;
  const car = featuredCars[featuredIndex % featuredCars.length];
  featuredSlider.innerHTML = `
    <article class="featured-card">
      <img src="${escapeHtml(carImage(car))}" alt="${escapeHtml(carTitle(car))}">
      <div class="featured-info">
        <p class="eyebrow">FEATURED VEHICLE · ${escapeHtml(car.year)}</p>
        <h3>${escapeHtml(carTitle(car))}</h3>
        <div class="featured-price">${money(car.price)}</div>
        <div class="featured-specs">${Number(car.km_driven || 0).toLocaleString("en-IN")} km &nbsp;·&nbsp; ${escapeHtml(car.fuel)} &nbsp;·&nbsp; ${escapeHtml(car.transmission)}<br>${escapeHtml(car.exterior_color || "Colour on request")}</div>
        <a class="button button-dark" href="${detailUrl(car)}">Explore this car ↗</a>
      </div>
    </article>`;
}
document.querySelector("#prevFeatured").addEventListener("click", () => { featuredIndex = (featuredIndex - 1 + featuredCars.length) % featuredCars.length; renderFeatured(); });
document.querySelector("#nextFeatured").addEventListener("click", () => { featuredIndex = (featuredIndex + 1) % featuredCars.length; renderFeatured(); });

function renderGrid() {
  const query = searchInput.value.trim().toLowerCase();
  const fuel = fuelFilter.value;
  const sort = sortFilter.value;
  let list = allCars.filter(car => {
    const searchable = `${car.brand} ${car.model} ${car.variant || ""} ${car.year}`.toLowerCase();
    return searchable.includes(query) && (!fuel || car.fuel === fuel);
  });
  if (sort === "price-low") list.sort((a,b) => Number(a.price)-Number(b.price));
  if (sort === "price-high") list.sort((a,b) => Number(b.price)-Number(a.price));
  if (sort === "year") list.sort((a,b) => Number(b.year)-Number(a.year));
  document.querySelector("#resultCount").textContent = `${list.length} vehicle${list.length === 1 ? "" : "s"}`;
  if (!list.length) { grid.innerHTML = `<div class="empty-state">No cars match your search right now.</div>`; return; }
  grid.innerHTML = list.map(car => `
    <article class="car-card">
      <a class="car-card-photo" href="${detailUrl(car)}"><img loading="lazy" src="${escapeHtml(carImage(car))}" alt="${escapeHtml(carTitle(car))}"><span class="status-pill">Available</span></a>
      <div class="car-card-body">
        <h3>${escapeHtml(carTitle(car))}</h3>
        <div class="car-price">${money(car.price)}</div>
        <div class="car-meta"><span>${escapeHtml(car.year)}</span><span>${Number(car.km_driven || 0).toLocaleString("en-IN")} km</span><span>${escapeHtml(car.fuel)}</span><span>${escapeHtml(car.transmission)}</span></div>
        <div class="card-actions"><a class="button button-soft" href="${detailUrl(car)}">View details</a><a class="button button-blue" href="${waLink(`Hi Axons Auto, I am interested in ${carTitle(car)} (${car.year}) listed at ${money(car.price)}. Please share more details.`, WHATSAPP_NUMBER)}" target="_blank" rel="noopener">WhatsApp</a></div>
      </div>
    </article>`).join("");
}

searchInput.addEventListener("input", renderGrid);
fuelFilter.addEventListener("change", renderGrid);
sortFilter.addEventListener("change", renderGrid);

async function init() {
  if (!isConfigured) { showConfigError(grid); featuredSlider.innerHTML = ""; return; }
  const { data, error } = await supabase.from("cars").select("*").eq("status", "available").order("created_at", { ascending: false });
  if (error) { grid.innerHTML = `<div class="empty-state">Could not load inventory: ${escapeHtml(error.message)}</div>`; return; }
  allCars = data || [];
  featuredCars = allCars.filter(car => car.featured);
  renderFeatured();
  renderGrid();
}
init();

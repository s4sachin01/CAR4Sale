import { supabase, isConfigured, money, escapeHtml, waLink, showConfigError, carTitle, carImage } from "./supabase.js";
import { WHATSAPP_NUMBER } from "./config.js";

const target = document.querySelector("#carDetail");
const params = new URLSearchParams(location.search);
const id = params.get("id");

function spec(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `<div class="detail-spec"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
}

async function init() {
  if (!isConfigured) { showConfigError(target); return; }
  if (!id) { target.innerHTML = `<div class="empty-state">No vehicle selected. <a href="index.html">Browse available cars</a>.</div>`; return; }
  const { data: car, error } = await supabase.from("cars").select("*").eq("id", id).eq("status", "available").maybeSingle();
  if (error || !car) { target.innerHTML = `<div class="empty-state">This vehicle is not currently available. <a href="index.html#inventory">Browse other cars</a>.</div>`; return; }
  document.title = `${carTitle(car)} | Axons Auto`;
  const images = car.images && car.images.length ? car.images : [carImage(car)];
  const message = `Hi Axons Auto, I am interested in ${carTitle(car)} (${car.year}), priced at ${money(car.price)}. Please contact me with more details.`;
  target.innerHTML = `
    <div class="detail-layout">
      <section class="gallery">
        <img id="galleryMain" class="gallery-main" src="${escapeHtml(images[0])}" alt="${escapeHtml(carTitle(car))}">
        <div class="gallery-thumbs">${images.map((url,i) => `<button type="button" class="${i===0?"active":""}" data-index="${i}" aria-label="Show photo ${i+1}"><img src="${escapeHtml(url)}" alt=""></button>`).join("")}</div>
      </section>
      <section class="detail-info">
        <p class="eyebrow">${escapeHtml(car.year)} · AXONS AUTO</p>
        <h1>${escapeHtml(carTitle(car))}</h1>
        <div class="detail-price">${money(car.price)}${car.negotiable ? ' <small style="font:500 12px DM Sans;color:#687386">Negotiable</small>' : ""}</div>
        <p class="detail-description">${escapeHtml(car.description || "Contact Axons Auto for more information about this vehicle.")}</p>
        <div class="detail-spec-grid">
          ${spec("Kilometres driven", `${Number(car.km_driven || 0).toLocaleString("en-IN")} km`)}
          ${spec("Fuel", car.fuel)}${spec("Transmission", car.transmission)}
          ${spec("Engine", car.engine_cc ? `${car.engine_cc} cc` : "")}
          ${spec("Power", car.bhp ? `${car.bhp} BHP` : "")}${spec("Drivetrain", car.drivetrain)}
          ${spec("Ownership", car.ownership)}${spec("Exterior colour", car.exterior_color)}
          ${spec("Interior colour", car.interior_color)}${spec("Registration year", car.registration_year)}
          ${spec("Registration / RTO", car.registration_number)}${spec("City", car.city)}
          ${spec("Insurance valid till", car.insurance_valid_till)}${spec("Insurance type", car.insurance_type)}
          ${spec("PUC valid till", car.puc_valid_till)}${spec("Tyre condition", car.tyre_condition)}
          ${spec("Service history", car.service_history)}${spec("Accident history", car.accident_history)}
        </div>
        <a class="button button-dark" href="${waLink(message, WHATSAPP_NUMBER)}" target="_blank" rel="noopener">Enquire on WhatsApp ↗</a>
      </section>
    </div>`;
  const main = document.querySelector("#galleryMain");
  document.querySelectorAll(".gallery-thumbs button").forEach(button => button.addEventListener("click", () => {
    main.src = images[Number(button.dataset.index)];
    document.querySelectorAll(".gallery-thumbs button").forEach(b => b.classList.toggle("active", b === button));
  }));
}
init();

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT-REF") &&
  SUPABASE_ANON_KEY.length > 30 &&
  !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}

export function waLink(message, number) {
  const cleanNumber = String(number || "").replace(/\D/g, "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function showConfigError(target) {
  target.innerHTML = `<div class="empty-state"><strong>Website setup is not complete yet.</strong><br>Open <code>js/config.js</code> and add your Supabase Project URL and anon/public key. Follow README.md.</div>`;
}

export function carTitle(car) {
  return [car.brand, car.model, car.variant].filter(Boolean).join(" ");
}

export function carImage(car) {
  return car.images && car.images.length
    ? car.images[0]
    : "https://placehold.co/1000x650/e8edf5/64748b?text=Axons+Auto";
}

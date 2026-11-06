import { supabase, isConfigured, money, escapeHtml, carTitle } from "./supabase.js";

const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const loginMessage = document.querySelector("#loginMessage");
const formMessage = document.querySelector("#formMessage");
const form = document.querySelector("#carForm");
let currentImages = [];
let allInventory = [];

const $ = id => document.getElementById(id);
const fields = ["brand","model","variant","year","registration_year","registration_number","price","negotiable","km_driven","fuel","transmission","engine_cc","bhp","drivetrain","ownership","exterior_color","interior_color","insurance_valid_till","insurance_type","puc_valid_till","tyre_condition","city","status","featured","description","service_history","accident_history"];

function message(el, text, success=false) {
  el.textContent = text;
  el.classList.toggle("success", success);
}
function value(id) { return $(id).type === "checkbox" ? $(id).checked : $(id).value.trim(); }
function showDashboard(show) { loginPanel.hidden = show; dashboard.hidden = !show; }

async function checkAdmin(user) {
  const { data, error } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) {
    await supabase.auth.signOut();
    showDashboard(false);
    message(loginMessage, "This account is not approved as an Axons Auto administrator. Ask the project owner to add its user ID to the admins table.");
    return false;
  }
  showDashboard(true);
  await loadInventory();
  return true;
}

async function initAuth() {
  if (!isConfigured) {
    message(loginMessage, "Setup required: add your Supabase URL and anon/public key in js/config.js.");
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await checkAdmin(session.user);
  supabase.auth.onAuthStateChange((_event, sessionNow) => {
    // Defer Supabase queries until after the auth callback returns.
    if (sessionNow?.user) queueMicrotask(() => checkAdmin(sessionNow.user));
    else showDashboard(false);
  });
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  message(loginMessage, "Signing in…");
  const { error } = await supabase.auth.signInWithPassword({ email: $("loginEmail").value.trim(), password: $("loginPassword").value });
  if (error) message(loginMessage, error.message);
});
$("signOutBtn").addEventListener("click", async () => { await supabase.auth.signOut(); showDashboard(false); });
$("adminSearch").addEventListener("input", renderInventory);

function getFormData() {
  const obj = {};
  fields.forEach(id => {
    let v = value(id);
    if (["year","registration_year","price","km_driven","engine_cc","bhp"].includes(id)) v = v === "" ? null : Number(v);
    if (["registration_year","engine_cc","bhp"].includes(id) && v === 0) v = null;
    if (id === "featured") v = Boolean(v);
    if (id === "negotiable") v = v === "true";
    if (["registration_number","variant","drivetrain","ownership","exterior_color","interior_color","insurance_valid_till","insurance_type","puc_valid_till","tyre_condition","city","description","service_history","accident_history"].includes(id)) v = v || null;
    obj[id] = v;
  });
  return obj;
}

function resetForm() {
  form.reset();
  $("carId").value = "";
  currentImages = [];
  $("existingImages").innerHTML = "";
  $("formTitle").textContent = "Add a car";
  $("saveCarBtn").textContent = "Save car";
  message(formMessage, "");
}

function renderImagePreviews() {
  $("existingImages").innerHTML = currentImages.map((url,index) => `
    <div class="preview-item"><img src="${escapeHtml(url)}" alt="Car photo ${index+1}"><button type="button" data-remove="${index}" aria-label="Remove photo">×</button></div>
  `).join("");
  $("existingImages").querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", () => {
    currentImages.splice(Number(button.dataset.remove),1);
    renderImagePreviews();
  }));
}

async function uploadImages(carId, files) {
  const uploaded = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
    if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
    const path = `${carId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("car-images").getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }
  return uploaded;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  $("saveCarBtn").disabled = true;
  message(formMessage, "Saving vehicle…");
  try {
    const id = $("carId").value || crypto.randomUUID();
    const obj = getFormData();
    const files = Array.from($("imageFiles").files || []);
    const newImages = await uploadImages(id, files);
    obj.images = [...currentImages, ...newImages];
    let result;
    if ($("carId").value) {
      result = await supabase.from("cars").update(obj).eq("id", id).select().single();
    } else {
      result = await supabase.from("cars").insert({ id, ...obj }).select().single();
    }
    if (result.error) throw result.error;
    message(formMessage, "Vehicle saved successfully.", true);
    resetForm();
    await loadInventory();
  } catch (error) {
    message(formMessage, `Could not save vehicle: ${error.message}`);
  } finally {
    $("saveCarBtn").disabled = false;
  }
});

function editCar(car) {
  $("carId").value = car.id;
  fields.forEach(id => {
    if (id in car && car[id] !== null) {
      if ($(id).type === "checkbox") $(id).checked = Boolean(car[id]);
      else $(id).value = car[id];
    } else if ($(id).type === "checkbox") $(id).checked = false;
    else if (id in car) $(id).value = "";
  });
  currentImages = [...(car.images || [])];
  renderImagePreviews();
  $("formTitle").textContent = `Edit ${carTitle(car)}`;
  $("saveCarBtn").textContent = "Update car";
  message(formMessage, "Editing selected vehicle.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderInventory() {
  const q = $("adminSearch").value.toLowerCase().trim();
  const list = allInventory.filter(car => `${car.brand} ${car.model} ${car.variant || ""}`.toLowerCase().includes(q));
  $("inventoryRows").innerHTML = list.length ? list.map(car => `
    <tr>
      <td><strong>${escapeHtml(carTitle(car))}</strong></td>
      <td>${escapeHtml(car.year)}</td><td>${money(car.price)}</td>
      <td>${Number(car.km_driven || 0).toLocaleString("en-IN")}</td>
      <td><span class="status-text ${escapeHtml(car.status)}">${escapeHtml(car.status)}</span></td>
      <td><div class="table-actions"><button data-edit="${car.id}">Edit</button><button data-delete="${car.id}" class="delete-btn">Delete</button></div></td>
    </tr>`).join("") : `<tr><td colspan="6">No matching cars.</td></tr>`;
  $("inventoryRows").querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
    const car = allInventory.find(item => item.id === button.dataset.edit);
    if (car) editCar(car);
  }));
  $("inventoryRows").querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => {
    const car = allInventory.find(item => item.id === button.dataset.delete);
    if (!car || !confirm(`Delete ${carTitle(car)}? This cannot be undone.`)) return;
    const { error } = await supabase.from("cars").delete().eq("id", car.id);
    if (error) alert(`Delete failed: ${error.message}`);
    else await loadInventory();
  }));
}

async function loadInventory() {
  const { data, error } = await supabase.from("cars").select("*").order("created_at", { ascending: false });
  if (error) { alert(`Could not load inventory: ${error.message}`); return; }
  allInventory = data || [];
  $("totalCount").textContent = allInventory.length;
  $("availableCount").textContent = allInventory.filter(c => c.status === "available").length;
  $("reservedCount").textContent = allInventory.filter(c => c.status === "reserved").length;
  $("soldCount").textContent = allInventory.filter(c => c.status === "sold").length;
  renderInventory();
}

$("resetFormBtn").addEventListener("click", resetForm);
$("cancelEditBtn").addEventListener("click", resetForm);
if (isConfigured) initAuth();

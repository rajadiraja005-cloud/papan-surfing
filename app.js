const config = window.STORE_CONFIG || {};
const storageKey = "papan-ombak-cart";
const productCards = [...document.querySelectorAll(".product-card")];
const products = new Map(
  productCards.map((card) => {
    const addButton = card.querySelector(".add-to-cart");
    return [
      addButton.dataset.productId,
      {
        id: addButton.dataset.productId,
        name: card.querySelector(".product-info h3").textContent.trim(),
        price: Number(addButton.dataset.price),
      },
    ];
  }),
);
const formatPrice = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

let cart = new Map();
try {
  const savedCart = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(savedCart)) {
    cart = new Map(
      savedCart
        .filter(
          (item) =>
            item &&
            products.has(item.id) &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            item.quantity < 100,
        )
        .map((item) => [item.id, item.quantity]),
    );
  }
} catch (error) {
  console.error("Keranjang tersimpan tidak dapat dibaca.", error);
}

function saveCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...cart].map(([id, quantity]) => ({ id, quantity }))));
  } catch (error) {
    console.error("Keranjang tidak dapat disimpan di browser.", error);
    showToast("Keranjang hanya tersimpan selama halaman ini terbuka.");
  }
}

const toast = document.querySelector("#toast");
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 4500);
}

function getCartTotal() {
  return [...cart].reduce((total, [id, quantity]) => {
    const product = products.get(id);
    return total + (product ? product.price * quantity : 0);
  }, 0);
}

const dialog = document.querySelector("#store-dialog");
const cartView = document.querySelector("#cart-view");
const checkoutView = document.querySelector("#checkout-view");
const paymentView = document.querySelector("#payment-view");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const checkoutStart = document.querySelector("#checkout-start");
let checkoutDetails = null;

function setDialogView(view) {
  cartView.hidden = view !== "cart";
  checkoutView.hidden = view !== "checkout";
  paymentView.hidden = view !== "payment";
  document.querySelector("#dialog-title").textContent =
    view === "cart" ? "Keranjang" : view === "checkout" ? "Checkout" : "Instruksi pembayaran";
  dialog.querySelector(".dialog-panel").scrollTop = 0;
}

function renderCart() {
  cartItems.replaceChildren();
  let itemCount = 0;

  cart.forEach((quantity, id) => {
    const product = products.get(id);
    if (!product) return;
    itemCount += quantity;

    const row = document.createElement("article");
    row.className = "cart-item";

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const name = document.createElement("strong");
    name.textContent = product.name;
    const price = document.createElement("span");
    price.textContent = formatPrice(product.price);
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Kurangi ${product.name}`);
    decrease.addEventListener("click", () => updateQuantity(id, -1));
    const quantityText = document.createElement("span");
    quantityText.textContent = String(quantity);
    quantityText.setAttribute("aria-label", `Jumlah ${quantity}`);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Tambah ${product.name}`);
    increase.addEventListener("click", () => updateQuantity(id, 1));
    controls.append(decrease, quantityText, increase);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.textContent = "Hapus";
    remove.setAttribute("aria-label", `Hapus ${product.name} dari keranjang`);
    remove.addEventListener("click", () => {
      cart.delete(id);
      saveCart();
      renderCart();
    });

    row.append(details, controls, remove);
    cartItems.append(row);
  });

  const total = getCartTotal();
  document.querySelector("#cart-count").textContent = String(itemCount);
  document.querySelector("#cart-subtotal").textContent = formatPrice(total);
  document.querySelector("#checkout-subtotal").textContent = formatPrice(total);
  document.querySelector("#payment-subtotal").textContent = formatPrice(total);
  cartEmpty.hidden = itemCount > 0;
  checkoutStart.disabled = itemCount === 0;
  saveCart();
}

function updateQuantity(id, difference) {
  const current = cart.get(id) || 0;
  const updated = current + difference;
  if (updated <= 0) {
    cart.delete(id);
  } else if (updated <= 99) {
    cart.set(id, updated);
  } else {
    showToast("Jumlah maksimum satu jenis papan adalah 99.");
  }
  renderCart();
}

function applyFilter(selectedFilter) {
  document.querySelectorAll(".filter-button").forEach((filterButton) => {
    const isSelected = filterButton.dataset.filter === selectedFilter;
    filterButton.classList.toggle("is-active", isSelected);
    filterButton.setAttribute("aria-pressed", String(isSelected));
  });

  productCards.forEach((card) => {
    card.hidden = selectedFilter !== "semua" && card.dataset.category !== selectedFilter;
  });
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.filter));
});

function filterLinksToKoleksi(selectedFilter) {
  applyFilter(selectedFilter);
  document.querySelector("#koleksi").scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll("[data-filter-link]").forEach((button) => {
  button.addEventListener("click", () => filterLinksToKoleksi(button.dataset.filterLink));
});

const phoneFormat = (digits) => `+${digits}`.trim();
const phoneTarget = document.querySelector("#topbar-phone-text");
if (config.whatsappNumber && phoneTarget) {
  phoneTarget.textContent = phoneFormat(config.whatsappNumber);
  const phoneLabel = document.querySelector("#topbar-phone");
  if (phoneLabel) phoneLabel.setAttribute("aria-label", `Hubungi kami via WhatsApp ${phoneTarget.textContent}`);
}
const emailTarget = document.querySelector("#topbar-email");
if (emailTarget) {
  const emailText = emailTarget.lastChild;
  if (emailText && emailText.nodeType === Node.TEXT_NODE) emailText.textContent = "Kontak & konsultasi papan";
}

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Buka menu" : "Tutup menu");
  mainNav.classList.toggle("is-open", !isExpanded);
});

mainNav.querySelectorAll("a, [data-filter-link]").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Buka menu");
    mainNav.classList.remove("is-open");
  });
});

document.querySelectorAll(".add-to-cart").forEach((button) => {
  button.addEventListener("click", () => {
    updateQuantity(button.dataset.productId, 1);
    showToast(`${products.get(button.dataset.productId).name} ditambahkan ke keranjang.`);
  });
});

document.querySelector(".cart-trigger").addEventListener("click", () => {
  setDialogView("cart");
  dialog.showModal();
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

checkoutStart.addEventListener("click", () => {
  checkoutDetails = null;
  setDialogView("checkout");
});

document.querySelector("#back-to-cart").addEventListener("click", () => setDialogView("cart"));
document.querySelector("#back-to-checkout").addEventListener("click", () => setDialogView("checkout"));

const bankDetails = document.querySelector("#bank-details");
if (config.bankName && config.bankAccountName && config.bankAccountNumber) {
  const bankName = document.createElement("strong");
  bankName.textContent = config.bankName;
  const accountNumber = document.createElement("span");
  accountNumber.textContent = config.bankAccountNumber;
  const accountName = document.createElement("span");
  accountName.textContent = `a.n. ${config.bankAccountName}`;
  bankDetails.append(bankName, accountNumber, accountName);
} else {
  bankDetails.textContent =
    "Detail rekening belum tersedia. Hubungi penjual melalui WhatsApp untuk memastikan ongkir dan rekening tujuan sebelum transfer.";
}

const qrisContainer = document.querySelector("#qris-container");
const qrisPlaceholder = document.querySelector("#qris-placeholder");
const paymentTabs = document.querySelectorAll(".payment-tab");
const paymentPanels = document.querySelectorAll(".payment-panel");

function showPaymentPanel(method) {
  paymentTabs.forEach((tab) => {
    const active = tab.dataset.paymentMethod === method;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  paymentPanels.forEach((panel) => {
    const isPanel = panel.id === `payment-panel-${method}`;
    panel.classList.toggle("hidden", !isPanel);
  });
}

paymentTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showPaymentPanel(tab.dataset.paymentMethod);
  });
});

if (config.qrImageUrl) {
  qrisPlaceholder.replaceChildren();
  const img = document.createElement("img");
  img.src = config.qrImageUrl;
  img.alt = "Kode QRIS pembayaran";
  img.style.maxWidth = "260px";
  img.style.height = "auto";
  img.style.borderRadius = "8px";
  img.style.display = "block";
  const caption = document.createElement("p");
  caption.textContent = config.qrCodeText ? config.qrCodeText : "Scan QRIS untuk pembayaran";
  caption.style.margin = "0";
  caption.style.fontSize = "11px";
  caption.style.color = "var(--muted)";
  qrisPlaceholder.append(img, caption);
} else if (config.qrCodeText) {
  qrisPlaceholder.replaceChildren();
  const code = document.createElement("p");
  code.textContent = config.qrCodeText;
  code.style.margin = "0";
  code.style.fontFamily = "Manrope, sans-serif";
  code.style.fontSize = "12px";
  code.style.fontWeight = "700";
  code.style.wordBreak = "break-all";
  qrisPlaceholder.append(code);
}

document.querySelector("#checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.size === 0) {
    setDialogView("cart");
    showToast("Keranjang kosong. Tambahkan papan sebelum checkout.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  checkoutDetails = {
    name: String(formData.get("name")).trim(),
    phone: String(formData.get("phone")).trim(),
    address: String(formData.get("address")).trim(),
  };
  setDialogView("payment");
});

document.querySelector("#send-order").addEventListener("click", () => {
  if (!checkoutDetails || cart.size === 0) {
    setDialogView("cart");
    showToast("Silakan isi data checkout dan periksa keranjang kembali.");
    return;
  }
  if (!config.whatsappNumber) {
    showToast("WhatsApp belum disetel. Isi WHATSAPP_NUMBER di .env lalu jalankan npm run build.");
    return;
  }

  const lines = [...cart].map(([id, quantity]) => {
    const product = products.get(id);
    return `- ${product.name} x${quantity}: ${formatPrice(product.price * quantity)}`;
  });
  const message = [
    `Halo ${config.storeName || "Papan Ombak"}, saya ingin memesan papan berikut:`,
    ...lines,
    `Subtotal papan: ${formatPrice(getCartTotal())} (ongkir belum termasuk)`,
    "",
    `Nama penerima: ${checkoutDetails.name}`,
    `Telepon: ${checkoutDetails.phone}`,
    `Alamat: ${checkoutDetails.address}`,
    "",
    "Mohon konfirmasi stok, ongkir, dan rekening pembayaran transfer. Saya akan mengirim bukti transfer setelah pembayaran.",
  ].join("\n");
  window.open(
    `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
});

document.querySelectorAll(".whatsapp-link, .product-image").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!config.whatsappNumber) {
      event.preventDefault();
      showToast("WhatsApp belum disetel. Isi WHATSAPP_NUMBER di .env lalu jalankan npm run build.");
      return;
    }

    event.preventDefault();
    const message = link.dataset.message || "Halo, saya ingin bertanya tentang papan surfing.";
    window.open(
      `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  });
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
renderCart();

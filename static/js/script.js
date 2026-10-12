/*
  The Cozy Table - script.js
  --------------------------
  Handles:
  1. Cart storage (browser localStorage, item names and quantities only)
  2. Cart count in the navbar
  3. Add to Cart buttons (home and menu pages)
  4. Menu search and category filters
  5. Cart page (quantities, remove, clear)
  6. Checkout page (place order and confirmation)
  7. Image fallback, mobile menu and toast message

  The browser NEVER sends prices. It sends only {"item name": quantity}.
  All money values shown on the page come from the Flask server.
*/

(function () {
  "use strict";

  // ------------------------------------------------------------
  // Settings (read from data-* attributes on <body>, set in base.html)
  // ------------------------------------------------------------
  const body = document.body;
  const PAGE = body.dataset.page;
  const BILL_URL = body.dataset.billUrl;
  const ORDER_URL = body.dataset.orderUrl;
  const MAX_QTY = parseInt(body.dataset.maxQty, 10) || 20;

  const CART_KEY = "cozyTableCart";
  const IMAGE_BASE = "/static/images/";
  const RUPEE = "\u20B9";

  // Used only if localStorage is blocked by the browser
  let memoryCart = {};

  // ------------------------------------------------------------
  // Small helper functions
  // ------------------------------------------------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function formatMoney(value) {
    return Number(value).toFixed(2);
  }

  function setVisible(element, visible) {
    if (element) {
      element.hidden = !visible;
    }
  }

  // Create an element safely (text is set with textContent, never innerHTML)
  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  // ------------------------------------------------------------
  // 1. Cart storage
  // ------------------------------------------------------------
  // Keep only valid entries: item name -> whole number between 1 and MAX_QTY
  function cleanCart(data) {
    const result = {};
    if (data && typeof data === "object" && !Array.isArray(data)) {
      Object.keys(data).forEach(function (key) {
        const qty = Number(data[key]);
        if (Number.isInteger(qty) && qty > 0) {
          result[key] = Math.min(qty, MAX_QTY);
        }
      });
    }
    return result;
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? cleanCart(JSON.parse(raw)) : {};
    } catch (error) {
      return cleanCart(memoryCart);
    }
  }

  function saveCart(cart) {
    memoryCart = cart;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      // localStorage unavailable: the in-memory copy is used instead
    }
    updateCartCount();
  }

  function clearCart() {
    saveCart({});
  }

  function cartItemCount(cart) {
    return Object.keys(cart).reduce(function (sum, key) {
      return sum + cart[key];
    }, 0);
  }

  // ------------------------------------------------------------
  // 2. Cart count in the navbar
  // ------------------------------------------------------------
  function updateCartCount() {
    const badge = byId("cart-count");
    if (!badge) {
      return;
    }
    const count = cartItemCount(loadCart());
    const changed = badge.textContent !== String(count);
    badge.textContent = count;
    if (changed) {
      badge.classList.remove("bump");
      void badge.offsetWidth; // restart the CSS animation
      badge.classList.add("bump");
    }
  }

  // ------------------------------------------------------------
  // Toast (small popup message)
  // ------------------------------------------------------------
  let toastTimer = null;

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.hidden = false;
    // Wait one frame so the CSS transition can run
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        toast.hidden = true;
      }, 300);
    }, 2200);
  }

  // ------------------------------------------------------------
  // Talking to the Flask server
  // ------------------------------------------------------------
  async function postJSON(url, payload) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error("Could not reach the server. Please check that it is running.");
    }

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!data) {
      throw new Error("The server sent an unexpected response.");
    }
    return data;
  }

  // ------------------------------------------------------------
  // 3. Add to Cart buttons
  // ------------------------------------------------------------
  function handleAddToCart(button) {
    const key = button.dataset.key;
    const card = button.closest(".food-card");
    const nameElement = card ? card.querySelector(".food-card__title") : null;
    const name = nameElement ? nameElement.textContent : "Item";

    const cart = loadCart();
    const current = cart[key] || 0;

    if (current >= MAX_QTY) {
      showToast("Maximum " + MAX_QTY + " of " + name + " per order.");
      return;
    }

    cart[key] = current + 1;
    saveCart(cart);
    showToast(name + " added to cart");

    // Short visual feedback on the button
    button.classList.add("added");
    button.textContent = "Added \u2713";
    setTimeout(function () {
      button.classList.remove("added");
      button.textContent = "Add to Cart";
    }, 1000);
  }

  function setupAddToCart() {
    document.addEventListener("click", function (event) {
      const button = event.target.closest(".btn-add");
      if (button) {
        handleAddToCart(button);
      }
    });
  }

  // ------------------------------------------------------------
  // 4. Menu search and category filters
  // ------------------------------------------------------------
  function setupMenuFilters() {
    const searchInput = byId("menu-search");
    const filterBar = byId("filter-bar");
    const grid = byId("menu-grid");
    const resultCount = byId("result-count");
    const noResults = byId("no-results");

    if (!searchInput || !filterBar || !grid) {
      return;
    }

    const cards = Array.from(grid.querySelectorAll(".food-card"));
    let activeCategory = "all";

    function applyFilters() {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(function (card) {
        const matchesCategory =
          activeCategory === "all" || card.dataset.category === activeCategory;
        const matchesSearch = card.dataset.search.indexOf(query) !== -1;
        const show = matchesCategory && matchesSearch;

        card.classList.toggle("is-hidden", !show);
        if (show) {
          visibleCount += 1;
        }
      });

      resultCount.textContent =
        "Showing " + visibleCount + (visibleCount === 1 ? " item" : " items");
      setVisible(noResults, visibleCount === 0);
    }

    searchInput.addEventListener("input", applyFilters);

    filterBar.addEventListener("click", function (event) {
      const button = event.target.closest(".filter-btn");
      if (!button) {
        return;
      }
      activeCategory = button.dataset.category;
      filterBar.querySelectorAll(".filter-btn").forEach(function (other) {
        other.classList.toggle("active", other === button);
      });
      applyFilters();
    });
  }

  // ------------------------------------------------------------
  // Shared bill helpers (cart page and checkout page)
  // ------------------------------------------------------------
  function fillBillNumbers(bill) {
    document.querySelectorAll("[data-bill]").forEach(function (element) {
      const field = element.dataset.bill;
      if (bill[field] !== undefined) {
        element.textContent = formatMoney(bill[field]);
      }
    });

    document.querySelectorAll("[data-discount-hint]").forEach(function (hint) {
      if (bill.discount_applied) {
        hint.textContent = "\uD83C\uDF89 " + bill.discount_percent + "% discount applied!";
        hint.classList.add("success");
      } else {
        hint.textContent =
          "Add " + RUPEE + formatMoney(bill.amount_to_discount) +
          " more to get " + bill.discount_percent + "% off.";
        hint.classList.remove("success");
      }
    });
  }

  // Shows an error message with an optional "Reset cart" button
  function showError(element, message, allowReset, onReset) {
    element.textContent = message;
    if (allowReset) {
      element.appendChild(document.createElement("br"));
      const resetButton = createElement("button", "btn btn-outline", "Reset cart");
      resetButton.type = "button";
      resetButton.addEventListener("click", onReset);
      element.appendChild(resetButton);
    }
    element.hidden = false;
  }

  function createOrderRow(line) {
    const row = createElement("li", "order-row");

    const info = createElement("div");
    info.appendChild(createElement("p", "order-row__name", line.name));
    info.appendChild(
      createElement(
        "p",
        "order-row__meta",
        line.quantity + " \u00D7 " + RUPEE + formatMoney(line.price)
      )
    );

    row.appendChild(info);
    row.appendChild(
      createElement("span", "order-row__total", RUPEE + formatMoney(line.line_total))
    );
    return row;
  }

  // ------------------------------------------------------------
  // 5. Cart page
  // ------------------------------------------------------------
  function setupCartPage() {
    const loading = byId("cart-loading");
    const errorBox = byId("cart-error");
    const emptyBox = byId("cart-empty");
    const content = byId("cart-content");
    const list = byId("cart-items");
    const clearButton = byId("clear-cart");

    let requestCounter = 0; // ignores old responses if the user clicks quickly

    function resetEverything() {
      clearCart();
      refreshCart();
    }

    function createCartRow(line) {
      const row = createElement("li", "cart-item");
      row.dataset.key = line.key;

      const imageBox = createElement("div", "cart-item__img");
      const image = createElement("img", "food-img");
      image.src = IMAGE_BASE + line.image;
      image.alt = line.name;
      imageBox.appendChild(image);

      const info = createElement("div", "cart-item__info");
      info.appendChild(createElement("p", "cart-item__name", line.name));
      info.appendChild(
        createElement("p", "cart-item__price", RUPEE + formatMoney(line.price) + " each")
      );

      const qtyControl = createElement("div", "qty-control");
      const minus = createElement("button", "qty-btn", "\u2212");
      minus.type = "button";
      minus.dataset.action = "decrease";
      minus.setAttribute("aria-label", "Decrease quantity of " + line.name);
      minus.disabled = line.quantity <= 1;

      const qtyValue = createElement("span", "qty-value", String(line.quantity));

      const plus = createElement("button", "qty-btn", "+");
      plus.type = "button";
      plus.dataset.action = "increase";
      plus.setAttribute("aria-label", "Increase quantity of " + line.name);
      plus.disabled = line.quantity >= MAX_QTY;

      qtyControl.append(minus, qtyValue, plus);

      const total = createElement(
        "span",
        "cart-item__total",
        RUPEE + formatMoney(line.line_total)
      );

      const remove = createElement("button", "remove-btn", "\u2715");
      remove.type = "button";
      remove.dataset.action = "remove";
      remove.setAttribute("aria-label", "Remove " + line.name + " from cart");

      row.append(imageBox, info, qtyControl, total, remove);
      return row;
    }

    function renderCart(bill) {
      list.replaceChildren();
      bill.items.forEach(function (line) {
        list.appendChild(createCartRow(line));
      });
      fillBillNumbers(bill);
      setVisible(content, true);
      checkMissingImages();
    }

    async function refreshCart() {
      const cart = loadCart();
      const thisRequest = ++requestCounter;
      setVisible(errorBox, false);

      if (Object.keys(cart).length === 0) {
        setVisible(loading, false);
        setVisible(content, false);
        setVisible(emptyBox, true);
        return;
      }

      try {
        const data = await postJSON(BILL_URL, { cart: cart });
        if (thisRequest !== requestCounter) {
          return; // a newer request is already running
        }
        setVisible(loading, false);
        setVisible(emptyBox, false);

        if (!data.ok) {
          setVisible(content, false);
          showError(errorBox, data.error, true, resetEverything);
          return;
        }
        renderCart(data.bill);
      } catch (error) {
        if (thisRequest !== requestCounter) {
          return;
        }
        setVisible(loading, false);
        setVisible(content, false);
        showError(errorBox, error.message, false);
      }
    }

    // One click listener handles all rows (event delegation)
    list.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }
      const row = button.closest(".cart-item");
      const key = row.dataset.key;
      const cart = loadCart();
      const action = button.dataset.action;

      if (action === "remove") {
        delete cart[key];
      } else if (action === "increase" && cart[key] < MAX_QTY) {
        cart[key] += 1;
      } else if (action === "decrease" && cart[key] > 1) {
        cart[key] -= 1;
      }

      saveCart(cart);
      refreshCart();
    });

    if (clearButton) {
      clearButton.addEventListener("click", function () {
        if (window.confirm("Remove all items from your cart?")) {
          clearCart();
          refreshCart();
        }
      });
    }

    refreshCart();
  }

  // ------------------------------------------------------------
  // 6. Checkout page
  // ------------------------------------------------------------
  function setupCheckoutPage() {
    const loading = byId("checkout-loading");
    const errorBox = byId("checkout-error");
    const emptyBox = byId("checkout-empty");
    const content = byId("checkout-content");
    const itemsList = byId("checkout-items");
    const placeButton = byId("place-order");
    const confirmation = byId("order-confirmation");

    function resetEverything() {
      clearCart();
      loadCheckout();
    }

    async function loadCheckout() {
      const cart = loadCart();
      setVisible(errorBox, false);

      if (Object.keys(cart).length === 0) {
        setVisible(loading, false);
        setVisible(content, false);
        setVisible(emptyBox, true);
        return;
      }

      try {
        const data = await postJSON(BILL_URL, { cart: cart });
        setVisible(loading, false);

        if (!data.ok) {
          setVisible(content, false);
          showError(errorBox, data.error, true, resetEverything);
          return;
        }

        itemsList.replaceChildren();
        data.bill.items.forEach(function (line) {
          itemsList.appendChild(createOrderRow(line));
        });
        fillBillNumbers(data.bill);
        setVisible(emptyBox, false);
        setVisible(content, true);
      } catch (error) {
        setVisible(loading, false);
        showError(errorBox, error.message, false);
      }
    }

    placeButton.addEventListener("click", async function () {
      placeButton.disabled = true;
      placeButton.textContent = "Placing order...";
      setVisible(errorBox, false);

      try {
        const data = await postJSON(ORDER_URL, { cart: loadCart() });

        if (!data.ok) {
          showError(errorBox, data.error, false);
          return;
        }

        // Show the confirmation screen
        byId("order-number").textContent = data.order_number;
        byId("order-message").textContent = data.message;
        byId("confirmation-total").textContent = formatMoney(data.bill.final_total);

        const confirmationList = byId("confirmation-items");
        confirmationList.replaceChildren();
        data.bill.items.forEach(function (line) {
          confirmationList.appendChild(createOrderRow(line));
        });

        // The order is "done", so empty the cart
        clearCart();
        setVisible(content, false);
        setVisible(confirmation, true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        showError(errorBox, error.message, false);
      } finally {
        placeButton.disabled = false;
        placeButton.textContent = "Place Order";
      }
    });

    loadCheckout();
  }

  // ------------------------------------------------------------
  // 7. Image fallback, mobile menu
  // ------------------------------------------------------------
  // If a photo is missing, show a soft coloured box with an emoji instead
  function applyImageFallback(image) {
    if (image.parentElement) {
      image.parentElement.classList.add("img-missing");
    }
  }

  // Check images that already failed before this script ran
  function checkMissingImages() {
    document.querySelectorAll("img.food-img").forEach(function (image) {
      if (image.complete && image.naturalWidth === 0) {
        applyImageFallback(image);
      }
    });
  }

  function setupImageFallback() {
    // "error" events do not bubble, so we listen in the capture phase
    document.addEventListener(
      "error",
      function (event) {
        const target = event.target;
        if (target && target.tagName === "IMG" && target.classList.contains("food-img")) {
          applyImageFallback(target);
        }
      },
      true
    );
    checkMissingImages();
  }

  function setupMobileMenu() {
    const toggle = byId("nav-toggle");
    const links = byId("nav-links");
    if (!toggle || !links) {
      return;
    }

    toggle.addEventListener("click", function () {
      const isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close the menu after tapping a link
    links.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ------------------------------------------------------------
  // Start everything
  // ------------------------------------------------------------
  setupMobileMenu();
  setupImageFallback();
  setupAddToCart();
  updateCartCount();

  if (PAGE === "menu") {
    setupMenuFilters();
  } else if (PAGE === "cart") {
    setupCartPage();
  } else if (PAGE === "checkout") {
    setupCheckoutPage();
  }
})();
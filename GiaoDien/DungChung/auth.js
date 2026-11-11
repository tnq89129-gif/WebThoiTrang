(() => {
  let currentUser = null;
  const authForm = document.getElementById("auth-form");
  const authStatus = document.getElementById("form-status");

  // ==================== 5 TÀI KHOẢN THEO YÊU CẦU ====================
  const ADMIN_USERS = [
    { email: "tnq89129@gmail.com",        password: "Quang@2026",  fullName: "Trần Nhật Quảng ",  roles: ["Admin"] },
    { email: "lightning191105@gmail.com", password: "Dat@2026",    fullName: "Đậu Công Đạt ",    roles: ["Admin"] },
    { email: "nqh.290@gmail.com",         password: "Huy@2026",    fullName: "Nguyễn Đình Huy",    roles: ["Admin"] },
    { email: "thuycutephomaique46@gmail.com", password: "Thuy@2026", fullName: "Vi Thị Diệu Thúy ", roles: ["Admin"] },
    { email: "nhatvuong026@gmail.com",     password: "Vuong@2026",  fullName: "Trần Văn Vượng ",  roles: ["Admin"] }
  ];

  // ==================== LƯU/ĐỌC TRẠNG THÁI ĐĂNG NHẬP ====================
  const STORAGE_KEYS = {
    USER: "demo_current_user",
    IS_LOGGED_IN: "demo_is_logged_in"
  };

  const LocalStore = {
    saveUser(user) {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, "true");
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
      }
    },
    getUser() {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    }
  };

  function normalizeUser(u) {
    if (!u) return null;
    const rawRoles = Array.isArray(u.roles)
      ? u.roles
      : Array.isArray(u.Roles)
        ? u.Roles
        : Array.isArray(u.role)
          ? u.role
          : Array.isArray(u.Role)
            ? u.Role
            : [];
    const roles = rawRoles.map((role) => String(role ?? "").trim()).filter(Boolean);
    return {
      ...u,
      name: u.fullName || u.name || u.FullName || "",
      avatarUrl: u.avatarUrl || u.AvatarUrl || u.avatar || u.Avatar || "",
      roles
    };
  }

  function hasRole(user, roleName) {
    const target = String(roleName ?? "").trim().toLowerCase();
    if (!target || !user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return roles.some((role) => String(role ?? "").trim().toLowerCase() === target);
  }

  const nav = document.querySelector(".site-dock");

  function refreshDockItems() {
    if (!nav) return;
    const dockLinks = Array.from(nav.querySelectorAll("a")).filter((item) => !item.hidden && !!item.offsetParent);
    const itemsForMotion = dockLinks.length ? dockLinks : Array.from(nav.querySelectorAll("a"));
    if (typeof window.__dockMotionItems === "undefined") {
      window.__dockMotionItems = itemsForMotion;
    }
    window.__dockMotionItems = itemsForMotion;
    return itemsForMotion;
  }

  function navigation() {
    const isStorePage = !location.pathname.includes("/QuanTri/");
    const isAdminSessionOnStore = isStorePage && !!currentUser && hasRole(currentUser, "Admin");
    const showAuthLinks = !currentUser || isAdminSessionOnStore;

    document.querySelectorAll('a[href*="DangNhap/"], a[href*="DangKy/"]').forEach((link) => {
      link.hidden = !showAuthLinks;
    });

    document.querySelectorAll('a[href*="QuanTri/"]').forEach((link) => {
      const canSeeAdmin = !!currentUser && !isAdminSessionOnStore && hasRole(currentUser, "Admin");
      link.hidden = !canSeeAdmin;
    });

    const dock = document.querySelector(".site-dock, .dock");
    if (!dock) return;

    const logoutLink = dock.querySelector("[data-logout]");
    if (logoutLink) {
      logoutLink.hidden = !currentUser || isAdminSessionOnStore;
      if (nav) {
        const visibleItems = refreshDockItems();
        if (visibleItems && typeof window.__dockMeasure === "function") {
          window.__dockMeasure();
        }
      }
      return;
    }

    if (currentUser && !isAdminSessionOnStore && dock.querySelector('a[href*="DangNhap/"]')) {
      const existingLogout = dock.querySelector("[data-logout]");
      if (!existingLogout) {
        const a = document.createElement("a");
        a.href = "#logout";
        a.dataset.logout = "";
        a.textContent = "Đăng xuất";
        a.className = "dock-item dock-item--enter";
        dock.appendChild(a);
      }
    }

    if (nav && typeof window.__dockMeasure === "function") {
      window.__dockMeasure();
    }
  }

  function getAppRoot() {
    const routeIndex = location.pathname.search(/\/(?:NguoiDung|QuanTri)\//);
    return routeIndex >= 0 ? location.pathname.slice(0, routeIndex) : "";
  }

  function ensureShopApi() {
    if (window.shop && typeof window.shop.request === "function") return window.shop;
    return {
      root: getAppRoot(),
      async request(url, method = "GET", body) {
        const headers = { Accept: "application/json" };
        if (method !== "GET") {
          const response = await fetch("/api/tai-khoan/csrf", { credentials: "same-origin", cache: "no-store" });
          if (!response.ok) throw new Error("Không lấy được mã bảo vệ.");
          const data = await response.json();
          headers["X-CSRF-TOKEN"] = data.token;
        }
        const isFormData = body instanceof FormData;
        if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
        const result = await fetch(url, {
          method, headers, credentials: "same-origin", cache: "no-store",
          body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
        });
        const text = await result.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }
        if (!result.ok) {
          const message = data?.message || data?.detail || "Yêu cầu không hợp lệ.";
          const err = new Error(message);
          err.status = result.status;
          throw err;
        }
        return data;
      },
      async csrf() {
        const response = await fetch("/api/tai-khoan/csrf", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error("Không lấy được mã bảo vệ.");
        const data = await response.json();
        return data.token;
      },
      async badge() {
        const el = document.getElementById("cart-badge");
        if (!el) return;
        try {
          const cart = await this.request("/api/gio-hang");
          el.textContent = String((cart || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0));
        } catch {
          el.textContent = "!";
        }
      },
      error(error) { console.error(error); },
      action: async function(button, work, onError) {
        if (button && button.disabled) return;
        if (button) button.disabled = true;
        try { await work(); }
        catch (error) { if (onError) onError(error); else console.error(error); }
        finally { if (button) button.disabled = false; }
      }
    };
  }

  window.storeAuth = { getCurrentUser: () => currentUser };
  const shop = ensureShopApi();
  window.shop = shop;

  // ==================== KIỂM TRA ĐĂNG NHẬP KHI TẢI TRANG ====================
  window.shopReady = (async () => {
    try {
      const storedUser = LocalStore.getUser();
      currentUser = storedUser ? normalizeUser(storedUser) : null;

      navigation();

      if (location.pathname.includes("/QuanTri/") && !(currentUser && hasRole(currentUser, "Admin"))) {
        if (!currentUser) {
          location.replace(shop.root + "/NguoiDung/DangNhap/index.html");
        } else {
          shop.error(new Error("Bạn không có quyền truy cập khu vực quản trị."));
        }
        return false;
      }

      if (!currentUser && /(GioHang|DonHang)/.test(location.pathname)) {
        location.replace(shop.root + "/NguoiDung/DangNhap/index.html");
        return false;
      }

      if (shop && typeof shop.badge === "function") {
        await shop.badge();
      }

      return true;
    } catch (error) {
      if (window.shop && typeof window.shop.error === "function") {
        window.shop.error(error);
      }
      return false;
    }
  })();

  // ==================== XỬ LÝ ĐĂNG NHẬP ====================
  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!authForm.reportValidity()) return;

      const values = new FormData(authForm);
      const email = String(values.get("email") || "").trim();
      const password = String(values.get("password") || "");

      await shop.action(authForm.querySelector('[type="submit"]'), async () => {
        if (!(await window.shopReady)) {
          throw new Error("Máy chủ chưa sẵn sàng. Hãy tải lại trang.");
        }

        if (authForm.dataset.authMode === "register") {
          if (password !== values.get("confirmPassword")) {
            throw new Error("Mật khẩu xác nhận chưa khớp.");
          }
          if (!values.has("terms")) {
            throw new Error("Vui lòng đồng ý điều khoản.");
          }
          throw new Error("Chức năng đăng ký tạm thời tắt ở phiên bản demo.");
        }

        // ✅ Kiểm tra tài khoản trong danh sách
        const foundUser = ADMIN_USERS.find(
          acc => acc.email === email && acc.password === password
        );

        if (!foundUser) {
          throw new Error("Email hoặc mật khẩu không đúng!");
        }

        LocalStore.saveUser({ ...foundUser });
        currentUser = normalizeUser(foundUser);
        navigation();

        location.href = shop.root + "/QuanTri/TongQuan/index.html";
      }, (error) => {
        if (authStatus) {
          authStatus.textContent = error.message;
          authStatus.dataset.state = "error";
        }
      });
    });
  }

  // ==================== XỬ LÝ ĐĂNG XUẤT ====================
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-logout]");
    if (!button) return;
    event.preventDefault();

    await shop.action(button, async () => {
      LocalStore.saveUser(null);
      currentUser = null;
      navigation();
      location.href = shop.root + "/NguoiDung/DangNhap/index.html";
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    const input = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!input) return;
    toggle.addEventListener("click", () => {
      const shouldReveal = input.type === "password";
      input.type = shouldReveal ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(shouldReveal));
      toggle.setAttribute("aria-label", shouldReveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    });
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (!nav || reduceMotion.matches || !finePointer.matches) return;

  let items = [];
  const measurements = [];
  let designUnit = 1;

  function refreshMotionItems() {
    const visibleItems = Array.from(nav.querySelectorAll("a")).filter((item) => !item.hidden && item.offsetParent !== null);
    items = visibleItems.length ? visibleItems : Array.from(nav.querySelectorAll("a")).filter((item) => !item.hidden || item.offsetParent !== null);
    if (!items.length) items = Array.from(nav.querySelectorAll("a"));
    window.__dockMotionItems = items;
    return items;
  }

  function measureItems() {
    refreshMotionItems();
    items.forEach((item) => {
      item.style.removeProperty("width");
      item.style.removeProperty("height");
      item.style.removeProperty("--lift");
      item.dataset.near = "false";
    });
    designUnit = Math.min(
      window.innerWidth / (window.innerWidth <= 900 ? 760 : 1600),
      1900 / 1600
    );
    measurements.length = 0;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      measurements.push({
        width: rect.width, height: rect.height,
        extraWidth: Math.min(18 * designUnit, rect.width * 0.24),
        extraHeight: 16 * designUnit
      });
    });
  }

  function setMagnification(item, amount) {
    const index = items.indexOf(item);
    const size = measurements[index];
    if (!size) return;
    const value = Math.max(0, Math.min(amount, 1.08));
    item.style.width = `${size.width + size.extraWidth * value}px`;
    item.style.height = `${size.height + size.extraHeight * value}px`;
    item.style.setProperty("--lift", `${3.5 * designUnit * value}px`);
    item.dataset.near = value > 0.08 ? "true" : "false";
  }

  function resetMagnification() {
    items.forEach((item) => setMagnification(item, 0));
  }

  function updateFromPointer(event) {
    const navRect = nav.getBoundingClientRect();
    const dx = event.clientX - (navRect.left + navRect.width / 2);
    const dy = event.clientY - (navRect.top + navRect.height / 2);
    const distance = Math.hypot(dx, dy);
    const brightness = Math.max(0, Math.min(1, 1 - distance / 260));
    nav.style.setProperty("--spec-angle", `${Math.atan2(dy, dx)}rad`);
    nav.style.setProperty("--spec-bright", `${brightness * brightness * 0.92}`);

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const proximity = Math.max(0, 1 - Math.abs(event.clientX - (rect.left + rect.width / 2)) / (128 * designUnit));
      setMagnification(items[index], proximity * proximity * (3 - 2 * proximity));
    });
  }

  window.__dockMeasure = measureItems;
  measureItems();
  window.addEventListener("resize", measureItems);
  nav.addEventListener("pointermove", updateFromPointer, { passive: true });
  nav.addEventListener("pointerleave", () => {
    resetMagnification();
    nav.style.setProperty("--spec-bright", "0");
  });
})();

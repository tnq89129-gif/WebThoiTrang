(() => {
  const title = document.getElementById("account-status-title");
  const description = document.getElementById("account-description");
  const note = document.getElementById("account-note");
  const actions = document.getElementById("account-actions");
  const avatar = document.getElementById("account-avatar");
  const avatarInput = document.getElementById("account-avatar-input");

  function getInitials(user) {
    const source = (user?.name || user?.fullName || user?.email || "A").trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return words.slice(0, 2).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
    }
    const emailName = String(user?.email || source).split("@")[0].trim();
    if (!emailName) return "A";
    return emailName.slice(0, 2).toUpperCase();
  }

  function getAvatarPalette(seed) {
    const palette = [
      { bg: "#d9efe0", fg: "#1a2d22" },
      { bg: "#f4dcb8", fg: "#342511" },
      { bg: "#dfe7ff", fg: "#1f2a4c" },
      { bg: "#f3d8e8", fg: "#421a36" },
      { bg: "#dff3f3", fg: "#173c3d" },
      { bg: "#e7dfff", fg: "#331f4d" },
      { bg: "#f7e4c4", fg: "#48300e" }
    ];
    const index = seed ? Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palette.length : 0;
    return palette[index];
  }

  function renderAvatar(user) {
    if (!avatar) return;
    if (!user) {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
      avatar.style.background = "rgba(201, 232, 214, .1)";
      avatar.style.color = "var(--accent)";
      return;
    }

    if (user.avatarUrl) {
      avatar.innerHTML = `<img src="${user.avatarUrl}" alt="Ảnh đại diện của ${user.name || user.email || 'tài khoản'}">`;
      avatar.style.background = "#dfe9e3";
      avatar.style.color = "";
      return;
    }

    const initials = getInitials(user);
    const palette = getAvatarPalette(user.email || user.name || "");
    avatar.innerHTML = `<span class="account-avatar-letter">${initials}</span>`;
    avatar.style.background = palette.bg;
    avatar.style.color = palette.fg;
    avatar.style.borderColor = "rgba(255,255,255,.18)";
  }

  async function uploadAvatar(file) {
    if (!file || !window.shop || typeof window.shop.request !== "function") return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await window.shop.request("/api/tai-khoan/avatar", "POST", formData);
      if (window.storeAuth?.getCurrentUser) {
        const current = window.storeAuth.getCurrentUser();
        if (current) current.avatarUrl = result.avatarUrl || current.avatarUrl;
      }
      renderAccount();
    } catch (error) {
      console.error("Không thể tải ảnh đại diện:", error);
      if (error?.message) note.textContent = error.message;
    }
  }

  function renderAccount() {
    try {
      const user = window.storeAuth?.getCurrentUser();
      const authLinks = actions.querySelectorAll('a[href*="DangNhap/"], a[href*="DangKy/"]');
      authLinks.forEach((link) => {
        link.hidden = Boolean(user);
      });
      document.getElementById("account-logout").hidden = !user;
      renderAvatar(user);

      if (!user) {
        title.textContent = "Bạn chưa đăng nhập";
        description.textContent = "Đăng nhập để xem thông tin tài khoản và các lựa chọn mua sắm của bạn.";
        note.textContent = "Đơn hàng đặt với tư cách khách vẫn có thể tra cứu sau khi đăng nhập bằng cùng email.";
        return;
      }

      title.textContent = user.name || user.email || "Tài khoản";
      description.textContent = user.email || "";
      const orders = JSON.parse(window.localStorage.getItem("orders") || "[]");
      if (!Array.isArray(orders)) throw new Error("Dữ liệu đơn hàng không hợp lệ.");
      const orderCount = orders.filter((order) => {
        const email = order.customerEmail || order.customer?.email || order.email || "";
        return String(email).toLocaleLowerCase("vi") === String(user.email || "").toLocaleLowerCase("vi");
      }).length;
      note.textContent = `${orderCount} đơn hàng được gắn với tài khoản này. Dữ liệu demo chỉ được lưu trên trình duyệt hiện tại.`;
    } catch (error) {
      console.error("Không thể tải thông tin tài khoản:", error);
      note.textContent = error.message || "Không thể tải thông tin tài khoản.";
    }
  }

  if (avatarInput) {
    avatarInput.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      if (!file) return;
      uploadAvatar(file);
      avatarInput.value = "";
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === "storeSession" || event.key === "orders") renderAccount();
  });

  renderAccount();
})();

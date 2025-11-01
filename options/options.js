function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("theme-dark");
    document.body.classList.remove("theme-light");
  } else if (theme === "light") {
    document.body.classList.add("theme-light");
    document.body.classList.remove("theme-dark");
  } else { // auto
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
    } else {
      document.body.classList.add("theme-light");
      document.body.classList.remove("theme-dark");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Theme settings
  const themeSelect = document.getElementById('themeSelect');
  const storedTheme = localStorage.bgTheme || "auto";
  themeSelect.value = storedTheme;
  applyTheme(storedTheme);

  themeSelect.addEventListener('change', () => {
    localStorage.bgTheme = themeSelect.value;
    applyTheme(themeSelect.value);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.bgTheme || "auto") === "auto")
      applyTheme("auto");
  });

  // Session timeout
  const timeoutInput = document.getElementById('timeoutInput');
  timeoutInput.value = localStorage.sessionTimeout || 30;
  timeoutInput.addEventListener('input', () => {
    localStorage.sessionTimeout = timeoutInput.value;
    document.getElementById('timeoutStatus').textContent = "Saved!";
    setTimeout(() => document.getElementById('timeoutStatus').textContent = '', 1200);
  });

  // Export keypair
  document.getElementById('saveKeypairBtn').addEventListener('click', () => {
    chrome.storage.local.get("userKeyPair", obj => {
      if (!obj || !obj.userKeyPair) {
        document.getElementById('keypairStatus').textContent = "No keypair found!";
        setTimeout(() => document.getElementById('keypairStatus').textContent = '', 1800);
        return;
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify(obj.userKeyPair, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = "kyber-keypair.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      document.getElementById('keypairStatus').textContent = "Downloaded!";
      setTimeout(() => document.getElementById('keypairStatus').textContent = '', 1800);
    });
  });

  // Reset extension data
  document.getElementById('resetExtensionBtn').addEventListener('click', () => {
    chrome.storage.local.clear(() => {
      localStorage.clear();
      document.getElementById('resetStatus').textContent = "All settings/data reset!";
      setTimeout(() => document.getElementById('resetStatus').textContent = '', 2100);
      document.getElementById('timeoutInput').value = 30;
      document.getElementById('themeSelect').value = "auto";
      applyTheme("auto");
    });
  });
});

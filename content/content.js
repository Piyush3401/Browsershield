// Encrypt password fields before form submit using the negotiated session key
document.addEventListener('submit', async function(event) {
  const form = event.target;
  let passInput = form.querySelector('input[type="password"]');
  if (!passInput) return;

  // Get encrypted session key from background (if active session)
  chrome.runtime.sendMessage({ type: "GET_SESSION_STATUS" }, async (resp) => {
    if (resp.active && window.sharedSecret) {
      // Encrypt password
      const msg = passInput.value;
      chrome.runtime.sendMessage({ type: "ENCRYPT", data: msg }, (enc) => {
        passInput.value = JSON.stringify(enc.encrypted);
      });
    }
  });
});

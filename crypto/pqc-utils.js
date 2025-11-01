function createSessionId() {
  return 'sess-' + Math.floor(Math.random() * 1e12).toString(36);
}

async function encryptAESGCM(msg, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBuffer = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyBuffer, enc.encode(msg));
  return { iv: Array.from(iv), cipher: Array.from(new Uint8Array(cipher)) };
}

async function decryptAESGCM({ cipher, iv }, key) {
  const keyBuffer = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, keyBuffer, new Uint8Array(cipher));
  return new TextDecoder().decode(dec);
}

if (typeof self !== 'undefined') {
  self.pqcUtils = { createSessionId, encryptAESGCM, decryptAESGCM };
}

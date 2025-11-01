importScripts("crypto/kyber.js");

let userKeyPair = null;
let sessionSecret = null;
let serverPubKey = null;
let lastCiphertext = null;

function createSessionId() {
  return 'sess-' + Math.floor(Math.random() * 1e12).toString(36);
}

// AES-GCM helpers (browser-native)
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

// Async-safe Chrome messaging handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "GEN_KEYS") {
        userKeyPair = Kyber.keyGen();
        sendResponse({ publicKey: Array.from(userKeyPair.publicKey), status: "Keypair generated" });
      }
      else if (msg.type === "SET_SERVER_PUBKEY") {
        serverPubKey = Uint8Array.from(msg.publicKey);
        sendResponse({ ok: true });
      }
      else if (msg.type === "START_SESSION") {
        if (!serverPubKey) return sendResponse({ err: "No server public key set" });
        const { ciphertext, sharedSecret } = Kyber.encapsulate(serverPubKey);
        lastCiphertext = ciphertext;
        sessionSecret = sharedSecret;
        sendResponse({
          cyphertext: Array.from(ciphertext),
          sessionActive: true,
          sessionId: createSessionId()
        });
      }
      else if (msg.type === "DECRYPT_SESSION") {
        const sharedSecret = Kyber.decapsulate(Uint8Array.from(msg.ciphertext), userKeyPair.privateKey);
        sendResponse({ sharedSecret: Array.from(sharedSecret) });
      }
      else if (msg.type === "ENCRYPT") {
        if (!sessionSecret) return sendResponse({ error: "No session established!" });
        const encrypted = await encryptAESGCM(msg.data, sessionSecret);
        sendResponse({ encrypted });
      }
      else if (msg.type === "DECRYPT") {
        if (!sessionSecret) return sendResponse({ error: "No session established!" });
        const decrypted = await decryptAESGCM(msg.cipher, sessionSecret);
        sendResponse({ decrypted });
      }
      else if (msg.type === "GET_SESSION_STATUS") {
        sendResponse({ active: !!sessionSecret });
      }
    } catch (err) {
      sendResponse({ error: err && err.message ? err.message : String(err) });
    }
  })();
  return true;  // Ensures response is delivered for async handlers!
});

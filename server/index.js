const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const kyber = require('kyber-crystals');
const { webcrypto } = require('crypto');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

let serverKeyPair, currentSharedSecret;

// Generate Kyber keypair at boot
kyber.keyPair().then(pair => serverKeyPair = pair);

// === STEP 1: Return server Kyber public key ===
app.get('/pubkey', (req, res) => {
  res.json({ publicKey: Array.from(serverKeyPair.publicKey) });
});

// === STEP 2: Receive encapsulated kyber ciphertext from frontend and derive shared secret ===
app.post('/encrypt', async (req, res) => {
  const { cyphertext } = req.body;
  currentSharedSecret = await kyber.decrypt(Uint8Array.from(cyphertext), serverKeyPair.privateKey);
  console.log('\n=== New session established! ===');
  console.log('Cyphertext (from client):', JSON.stringify(cyphertext));
  console.log('Shared secret (bytes):', Array.from(currentSharedSecret));
  res.json({ sharedSecret: Array.from(currentSharedSecret) });
});

// === STEP 3: Receive AES-GCM encrypted message and decrypt ===
app.post('/message', async (req, res) => {
  const { encrypted } = req.body;
  console.log('\n--- Encrypted message arrived! ---');
  console.log('Received (AES-GCM object):', JSON.stringify(encrypted, null, 2));
  if (!currentSharedSecret) {
    console.log('ERROR: No shared secret/session established!');
    res.json({ error: "No shared secret in session" });
    return;
  }
  try {
    const plaintext = await decryptAESGCM(encrypted, currentSharedSecret);
    console.log('>>> Decrypted message:', plaintext);
    res.json({ plaintext });
  } catch (err) {
    console.log('!!! Error in decryption:', err);
    res.json({ error: "Decryption failed" });
  }
});

// Decryption helper (AES-GCM using shared secret from Kyber)
async function decryptAESGCM({ cipher, iv }, keyBytes) {
  const subtle = webcrypto.subtle;
  const keyBuffer = await subtle.importKey(
    "raw",
    Buffer.from(keyBytes),
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const decBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv) },
    keyBuffer,
    Buffer.from(cipher)
  );
  return Buffer.from(decBuffer).toString();
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

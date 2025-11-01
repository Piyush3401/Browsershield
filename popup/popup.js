function isLikelyKyberKey(arr) {
  return Array.isArray(arr) &&
    arr.length > 30 && arr.length < 2000 &&
    arr.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('genKeyBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "GEN_KEYS" }, resp => {
      document.getElementById('userPubKey').value = resp && resp.publicKey
        ? JSON.stringify(resp.publicKey)
        : "";
      document.getElementById('banner').textContent = resp && resp.status
        ? resp.status : (resp && resp.error ? resp.error : "Keypair generation failed.");
    });
  });

  document.getElementById('startSessionBtn').addEventListener('click', () => {
    let pkRaw = document.getElementById('serverPubKey').value.trim();
    if (!pkRaw) {
      document.getElementById('banner').textContent = "Paste server public key.";
      return;
    }
    let serverPubKey;
    try {
      serverPubKey = JSON.parse(pkRaw);
    } catch (e) {
      document.getElementById('banner').textContent = "Invalid public key format!";
      return;
    }
    if (!isLikelyKyberKey(serverPubKey)) {
      document.getElementById('banner').textContent = "Key format invalid! Must be Kyber public key.";
      return;
    }
    chrome.runtime.sendMessage({ type: "SET_SERVER_PUBKEY", publicKey: serverPubKey }, () => {
      chrome.runtime.sendMessage({ type: "START_SESSION" }, resp => {
        document.getElementById('banner').textContent =
          resp && resp.sessionActive ? "Session established!"
          : (resp && resp.err ? resp.err : "Session failed.");
      });
    });
  });

 document.getElementById('encryptBtn').addEventListener('click', () => {
  const msg = document.getElementById('plainMsg').value;
  if (!msg) {
    document.getElementById('banner').textContent = "Enter a message to encrypt.";
    document.getElementById('encryptedMsg').textContent = "";
    return;
  }
  chrome.runtime.sendMessage({ type: "ENCRYPT", data: msg }, resp => {
    if (resp && resp.encrypted) {
      document.getElementById('encryptedMsg').textContent = JSON.stringify(resp.encrypted, null, 2);
      document.getElementById('banner').textContent = "Message encrypted!";
      // >>> Send to server
      fetch('http://localhost:4000/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted: resp.encrypted })
      }).then(r => r.json())
      .then(data => {
        if (data.plaintext)
          document.getElementById('encryptedMsg').textContent += "\nServer decrypted: " + data.plaintext;
      }).catch(e => {
        document.getElementById('encryptedMsg').textContent += "\nServer POST fail: " + e;
      });
    } else {
      let errorMsg = (resp && resp.error) ? resp.error : "No encrypted message returned.";
      document.getElementById('banner').textContent = errorMsg;
      document.getElementById('encryptedMsg').textContent = errorMsg;
    }
  });
});


  document.getElementById('decryptBtn').addEventListener('click', () => {
    const input = document.getElementById('decryptInput').value;
    let enc;
    try {
      enc = JSON.parse(input);
      if (!(enc && enc.iv && enc.cipher)) {
        throw new Error("JSON must have iv and cipher fields.");
      }
    } catch (e) {
      document.getElementById('decryptedMsg').textContent = "Invalid encrypted JSON!";
      return;
    }
    chrome.runtime.sendMessage({ type: "DECRYPT", cipher: enc }, resp => {
      if (resp && resp.decrypted) {
        document.getElementById('decryptedMsg').textContent = resp.decrypted;
      } else {
        let errorMsg = (resp && resp.error) ? resp.error : "No decrypted message returned.";
        document.getElementById('decryptedMsg').textContent = errorMsg;
      }
    });
  });

  chrome.runtime.sendMessage({ type: "GET_SESSION_STATUS" }, (resp) => {
    if (resp && resp.active) {
      document.getElementById('banner').textContent = "Session already active.";
    }
  });
});

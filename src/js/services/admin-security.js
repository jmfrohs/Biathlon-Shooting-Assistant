/*
MIT License

Copyright (c) 2026 jmfrohs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Admin Security Service — Handles PIN protection & WebAuthn (Face ID / Touch ID / Fingerprint)
 * for securing the admin.html page.
 */

const AdminSecurity = (function () {
  const KEY_PIN_HASH = 'b_admin_pin_hash';
  const KEY_PIN_ENABLED = 'b_admin_pin_enabled';
  const KEY_WEBAUTHN_CRED_ID = 'b_admin_webauthn_cred_id';
  const KEY_WEBAUTHN_ENABLED = 'b_admin_webauthn_enabled';
  const KEY_UNLOCKED = 'b_admin_unlocked';

  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pin).trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  return {
    isPinEnabled() {
      return localStorage.getItem(KEY_PIN_ENABLED) === 'true' && this.hasPinSet();
    },

    hasPinSet() {
      return !!localStorage.getItem(KEY_PIN_HASH);
    },

    async setAdminPin(pin) {
      if (!pin || String(pin).trim().length < 4) {
        throw new Error('Der PIN/das Passwort muss mindestens 4 Zeichen lang sein.');
      }

      const hash = await hashPin(pin);
      localStorage.setItem(KEY_PIN_HASH, hash);
      localStorage.setItem(KEY_PIN_ENABLED, 'true');
      return true;
    },

    async verifyPin(pin) {
      if (!this.hasPinSet()) return true;
      const storedHash = localStorage.getItem(KEY_PIN_HASH);
      const inputHash = await hashPin(pin);
      const isValid = storedHash === inputHash;
      if (isValid) {
        this.unlockSession();
      }
      return isValid;
    },

    setPinEnabled(enabled) {
      if (enabled && !this.hasPinSet()) {
        throw new Error('Es muss zuerst ein PIN/Passwort festgelegt werden.');
      }
      localStorage.setItem(KEY_PIN_ENABLED, enabled ? 'true' : 'false');
    },

    removePin() {
      localStorage.removeItem(KEY_PIN_HASH);
      localStorage.removeItem(KEY_PIN_ENABLED);
      localStorage.removeItem(KEY_WEBAUTHN_CRED_ID);
      localStorage.removeItem(KEY_WEBAUTHN_ENABLED);
      this.lockSession();
    },

    isUnlocked() {
      return sessionStorage.getItem(KEY_UNLOCKED) === 'true';
    },

    unlockSession() {
      sessionStorage.setItem(KEY_UNLOCKED, 'true');
    },

    lockSession() {
      sessionStorage.removeItem(KEY_UNLOCKED);
    },

    async isWebAuthnSupported() {
      if (!window.PublicKeyCredential) return false;
      try {
        if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
          return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }
        return true;
      } catch {
        return false;
      }
    },

    isWebAuthnEnabled() {
      return (
        localStorage.getItem(KEY_WEBAUTHN_ENABLED) === 'true' &&
        !!localStorage.getItem(KEY_WEBAUTHN_CRED_ID)
      );
    },

    async registerWebAuthn() {
      const isSupported = await this.isWebAuthnSupported();
      if (!isSupported) {
        throw new Error(
          'Biometrie (Face ID / Touch ID) wird auf diesem Gerät/Browser nicht unterstützt.'
        );
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Biathlon Shooting Assistant' },
          user: {
            id: new Uint8Array([65, 100, 109, 105, 110]),
            name: 'admin@biathlon.local',
            displayName: 'Admin Account',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      if (!credential) {
        throw new Error('Biometrische Registrierung abgebrochen.');
      }

      const credIdBase64 = bufferToBase64(credential.rawId);
      localStorage.setItem(KEY_WEBAUTHN_CRED_ID, credIdBase64);
      localStorage.setItem(KEY_WEBAUTHN_ENABLED, 'true');
      return true;
    },

    disableWebAuthn() {
      localStorage.setItem(KEY_WEBAUTHN_ENABLED, 'false');
    },

    async authenticateWebAuthn() {
      if (!this.isWebAuthnEnabled()) return false;

      const credIdBase64 = localStorage.getItem(KEY_WEBAUTHN_CRED_ID);
      if (!credIdBase64) return false;

      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [
              {
                id: base64ToBuffer(credIdBase64),
                type: 'public-key',
              },
            ],
            userVerification: 'required',
            timeout: 60000,
          },
        });

        if (assertion) {
          this.unlockSession();
          return true;
        }
      } catch (err) {
        console.warn('WebAuthn Verifizierung abgebrochen/fehlgeschlagen:', err.message);
      }
      return false;
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminSecurity;
}

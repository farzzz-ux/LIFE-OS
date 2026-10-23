/**
 * LIFE OS — Modular UI Component & Notification System
 * Features:
 * - High-contrast toast notifications with action buttons
 * - Modern Authentication Modal & Mobile Bottom-Sheet Controller
 * - Segmented Tab Controller (Sign In vs Create Account)
 * - Inline Password Visibility Toggle with SVG Eye Icons
 * - Defensive Authentication Submission & Error Banner
 * - Audio feedback & safe-area viewport responsiveness
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeOSUI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const EYE_OPEN_SVG = `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const EYE_OFF_SVG = `<svg class="eye-off-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  /**
   * Display toast notification
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type] || '•'}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 250);
      };
    }

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 250);
      }
    }, duration);
  }

  /**
   * Toggle between login and registration mode in the auth modal
   */
  function switchAuthMode(mode) {
    if (typeof document === 'undefined') return;
    const targetMode = mode === 'register' || mode === 'signup' ? 'register' : 'login';
    const loginTab = document.getElementById('auth-tab-login');
    const regTab = document.getElementById('auth-tab-register');
    const nameGroup = document.getElementById('auth-name-group');
    const titleEl = document.getElementById('auth-modal-title');
    const subtitleEl = document.getElementById('auth-modal-subtitle');
    const submitLabel = document.getElementById('auth-submit-label');
    const submitIcon = document.getElementById('auth-submit-icon');
    const passHint = document.getElementById('auth-password-hint');
    const passInput = document.getElementById('auth-password-input');

    hideAuthError();

    if (targetMode === 'register') {
      if (loginTab) {
        loginTab.classList.remove('active');
        loginTab.setAttribute('aria-selected', 'false');
      }
      if (regTab) {
        regTab.classList.add('active');
        regTab.setAttribute('aria-selected', 'true');
      }
      if (nameGroup) nameGroup.style.display = 'block';
      if (titleEl) titleEl.textContent = 'Create Cloud Account';
      if (subtitleEl) subtitleEl.textContent = 'Multi-device sync & isolated life data partition';
      if (submitLabel) submitLabel.textContent = 'Create Account & Sync';
      if (submitIcon) submitIcon.className = 'fa-solid fa-user-plus';
      if (passHint) passHint.style.display = 'inline-block';
      if (passInput) passInput.setAttribute('autocomplete', 'new-password');
    } else {
      if (regTab) {
        regTab.classList.remove('active');
        regTab.setAttribute('aria-selected', 'false');
      }
      if (loginTab) {
        loginTab.classList.add('active');
        loginTab.setAttribute('aria-selected', 'true');
      }
      if (nameGroup) nameGroup.style.display = 'none';
      if (titleEl) titleEl.textContent = 'Cloud Account & Sync';
      if (subtitleEl) subtitleEl.textContent = 'Sign in to sync your command center across devices';
      if (submitLabel) submitLabel.textContent = 'Sign In to Life OS';
      if (submitIcon) submitIcon.className = 'fa-solid fa-right-to-bracket';
      if (passHint) passHint.style.display = 'none';
      if (passInput) passInput.setAttribute('autocomplete', 'current-password');
    }
  }

  let _lastUiPasswordToggleTime = 0;
  /**
   * Inline password visibility toggle button controller
   */
  function togglePasswordVisibility(targetInputId = 'auth-password-input', toggleBtnId = 'auth-password-toggle') {
    if (typeof document === 'undefined') return;
    const now = Date.now();
    if (now - _lastUiPasswordToggleTime < 250) return;
    _lastUiPasswordToggleTime = now;

    const input = document.getElementById(targetInputId) || document.querySelector('.auth-password-input') || document.getElementById('auth-login-pass') || document.getElementById('auth-reg-pass');
    const btn = document.getElementById(toggleBtnId) || document.querySelector('.password-toggle-btn');
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    if (btn) {
      btn.innerHTML = isPassword ? EYE_OFF_SVG : EYE_OPEN_SVG;
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    }
  }

  /**
   * Display dedicated error/status banner
   */
  function showAuthError(message) {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('auth-error-msg');
    if (!banner) return;
    const textEl = banner.querySelector('.auth-error-text');
    if (textEl) {
      textEl.textContent = message;
    } else {
      banner.textContent = message;
    }
    banner.style.display = 'flex';
  }

  /**
   * Hide dedicated error/status banner
   */
  function hideAuthError() {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById('auth-error-msg');
    if (banner) {
      banner.style.display = 'none';
      const textEl = banner.querySelector('.auth-error-text');
      if (textEl) textEl.textContent = '';
    }
  }

  /**
   * Defensive authentication form submission handler
   */
  async function handleAuthSubmit(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    hideAuthError();

    const regTab = document.getElementById('auth-tab-register');
    const isRegister = regTab && regTab.classList.contains('active');

    const emailInput = document.getElementById('auth-email-input') || document.getElementById('auth-login-email') || document.getElementById('auth-reg-email');
    const passInput = document.getElementById('auth-password-input') || document.getElementById('auth-login-pass') || document.getElementById('auth-reg-pass');
    const nameInput = document.getElementById('auth-reg-name');

    const email = (emailInput?.value || '').trim();
    const password = passInput?.value || '';
    const name = (nameInput?.value || '').trim();

    if (!email) {
      showAuthError('Please enter your email address.');
      emailInput?.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAuthError('Please enter a valid email address (e.g. commander@lifeos.app).');
      emailInput?.focus();
      return;
    }

    if (!password) {
      showAuthError('Please enter your password.');
      passInput?.focus();
      return;
    }

    if (isRegister && !name) {
      showAuthError('Please enter a username (max 6 letters).');
      nameInput?.focus();
      return;
    }

    if (isRegister && name.length > 6) {
      showAuthError('Username must be max 6 letters to fit in your account button.');
      nameInput?.focus();
      return;
    }

    if (isRegister && password.length < 6) {
      showAuthError('Password must be at least 6 characters long.');
      passInput?.focus();
      return;
    }

    const submitBtn = document.getElementById('auth-submit-btn');
    const submitLabel = document.getElementById('auth-submit-label');
    const submitIcon = document.getElementById('auth-submit-icon');
    const originalLabel = submitLabel ? submitLabel.textContent : '';
    const originalIconClass = submitIcon ? submitIcon.className : '';

    if (submitBtn) submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = isRegister ? 'Creating Account...' : 'Signing In...';
    if (submitIcon) submitIcon.className = 'fa-solid fa-spinner fa-spin';

    try {
      const safeName = name.slice(0, 6);
      if (typeof window !== 'undefined' && typeof window.registerUser === 'function' && isRegister) {
        await window.registerUser(email, password, safeName);
      } else if (typeof window !== 'undefined' && typeof window.loginUser === 'function' && !isRegister) {
        await window.loginUser(email, password);
      } else if (typeof window !== 'undefined' && window.LifeOSApi) {
        const res = isRegister
          ? await window.LifeOSApi.register(email, password, safeName)
          : await window.LifeOSApi.login(email, password);
        if (res && res.token) {
          window.LifeOSApi.setAuthToken(res.token);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('life_os_auth_user', JSON.stringify(res.user));
          }
          showToast(`Welcome, ${res.user.name || 'Commander'}!`, 'success');
          if (window.closeAuthModal) window.closeAuthModal();
          if (window.loadFullState) await window.loadFullState();
        }
      }
    } catch (err) {
      showAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = originalLabel;
      if (submitIcon) submitIcon.className = originalIconClass;
    }
  }

  // Also bind to window if available in browser
  if (typeof window !== 'undefined') {
    window.switchAuthMode = switchAuthMode;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.handleAuthSubmit = handleAuthSubmit;
    window.showAuthError = showAuthError;
    window.hideAuthError = hideAuthError;
  }

  return {
    showToast,
    switchAuthMode,
    togglePasswordVisibility,
    showAuthError,
    hideAuthError,
    handleAuthSubmit
  };
});

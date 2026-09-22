/** Authentication is a screen state, not a change of URL or a cookie count. */
export function sameLoginAddress(current, loginUrl) {
  try {
    const a = new URL(current), b = new URL(loginUrl);
    const route = u => u.pathname.replace(/\/$/, '') + (/^#(?:\/|!)/.test(u.hash) ? u.hash : '');
    return a.origin === b.origin && route(a) === route(b);
  } catch { return false; }
}

export async function inspectAuthentication(page) {
  const states = [];
  for (const frame of page.frames()) {
    if (frame !== page.mainFrame()) {
      const element = await frame.frameElement().catch(() => null);
      const visible = element && await element.isVisible().catch(() => false);
      await element?.dispose();
      if (!visible) continue;
    }
    const state = await frame.evaluate(() => {
      const visible = e => Boolean(e.getClientRects().length) && !e.closest('[hidden],[aria-hidden="true"]')
        && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
      const find = selector => [...document.querySelectorAll(selector)].filter(visible);
      const name = e => `${e.getAttribute('aria-label') || ''} ${e.textContent || ''}`.trim();
      const signIn = /\b(?:log\s*in|sign\s*in|login|signin)\b/i;
      const logout = find('a,button,[role="button"],[role="link"]').some(e =>
        /\b(?:log\s*out|sign\s*out|logout|signout|logoff)\b/i.test(name(e)));
      const account = find('.woocommerce-MyAccount-navigation,[data-authenticated="true"]').length > 0;
      const signedInCue = logout || account;
      const inputs = find('input');
      const passwords = inputs.filter(e => e.type === 'password');
      const signInForm = passwords.some(e => {
        const form = e.closest('form');
        const buttons = form ? [...form.querySelectorAll('button,input[type="submit"]')].filter(visible) : find('button,input[type="submit"]');
        const loginButton = buttons.some(b => signIn.test(name(b) || b.value || ''));
        const changePassword = e.autocomplete === 'new-password'
          || /(?:new|confirm|repeat|password_current|current_password)/i.test(`${e.name} ${e.id}`)
          || buttons.some(b => /save changes|change password|update password/i.test(name(b)));
        return loginButton || (!signedInCue && !changePassword);
      });
      const challenge = inputs.some(e => e.autocomplete === 'one-time-code'
        || /(?:\botp\b|\btotp\b|verification.?code|security.?code|one.?time.?code)/i.test(`${e.id} ${e.name} ${e.getAttribute('aria-label') || ''}`))
        || find('h1,h2,legend,[role="alert"]').some(e => /two.factor|multi.factor|approve.*sign.in|verify your identity|enter.*verification code/i.test(name(e)));
      const usernameStep = !signedInCue && !passwords.length
        && inputs.some(e => e.autocomplete === 'username' || /^(?:username|email)$/i.test(e.name))
        && find('button,input[type="submit"]').some(e => /^(?:next|continue|sign in|log in)$/i.test(name(e) || e.value || ''));
      const rejected = find('[data-test="error"],[role="alert"],.error-message,.woocommerce-error').some(e =>
        /incorrect|invalid|locked|denied|do not match|required|failed|error/i.test(name(e)));
      const denied = find('h1,h2').some(e => /^(?:401|403|404)|access denied|forbidden|unauthorized|page not found/i.test(name(e)));
      return { signedInCue, signInForm: signInForm || usernameStep, challenge, rejected, denied,
        ready: document.readyState !== 'loading' && Boolean(document.body?.innerText.trim()) };
    }).catch(() => ({ ready: false }));
    states.push({ ...state, main: frame === page.mainFrame() });
  }
  return {
    signedInCue: states.some(s => s.main && s.signedInCue),
    signInForm: states.some(s => s.signInForm),
    challenge: states.some(s => s.challenge),
    rejected: states.some(s => s.rejected && s.signInForm),
    denied: states.some(s => s.main && s.denied),
    ready: states.some(s => s.main && s.ready),
  };
}

export async function checkLogin(page, authentication, applicationOrigin) {
  if (page.isClosed()) return { accepted: false, message: 'The login window was closed. Start again.' };
  const state = await inspectAuthentication(page);
  const origin = applicationOrigin || new URL(authentication.loginUrl).origin;
  if (new URL(page.url()).origin !== origin) return { ...state, accepted: false,
    message: 'Finish verification and return to the application before confirming login.' };
  if (state.rejected) return { ...state, accepted: false,
    message: 'The website rejected the login. Check the username, password, and account status, then retry. No protected pages were audited.' };
  if (state.challenge) return { ...state, accepted: false,
    message: 'Additional sign-in verification is still visible. Complete it in the login window, then confirm again.' };
  if (state.signInForm) return { ...state, accepted: false,
    message: 'The sign-in form is still visible. Complete sign-in in the login window, then confirm again.' };
  if (!state.ready || state.denied) return { ...state, accepted: false,
    message: 'The signed-in application is not ready or access was denied. Wait for it to load or check your account access.' };
  if (authentication.successUrlContains && !page.url().includes(authentication.successUrlContains)) return { ...state, accepted: false,
    message: 'The expected signed-in page has not been reached. Check the expected page setting or finish signing in.' };
  if (sameLoginAddress(page.url(), authentication.loginUrl) && !state.signedInCue) return { ...state, accepted: false,
    message: 'The address can stay the same after login, but signed-in content could not yet be verified. Make sure your account dashboard or sign-out control is visible, then confirm again.' };
  return { ...state, accepted: true };
}

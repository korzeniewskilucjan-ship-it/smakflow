export const APP_CONFIG = {
  appName: 'Smakflow',
  brandName: 'Lody u Lucjana',
  version: '2.6.0',
  defaultLocations: [
    'Naramowicka 336',
    'Karpia 11',
    'Magazyn Główny'
  ],
  defaultPortionsPerTub: 35,
  defaultHourlyRate: 28.10,
  theme: 'dark-navy'
};

export const SUPABASE_CONFIG = {
  url: window.__SMAKFLOW_SUPABASE_URL__ || 'https://bxmgiigbaxzmqcgjiulh.supabase.co',
  anonKey: window.__SMAKFLOW_SUPABASE_ANON_KEY__ || 'sb_publishable_Vu5qlLsoquae30Rw6SA4Ug_UqI7ugEU',
  functions: {
    apiProxy: 'api-proxy',
    iposSync: 'ipos-sync'
  }
};

window.APP_CONFIG = APP_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.__SMAKFLOW_SUPABASE_URL__ = SUPABASE_CONFIG.url;
window.__SMAKFLOW_SUPABASE_ANON_KEY__ = SUPABASE_CONFIG.anonKey;

if (window.supabase && typeof window.supabase.createClient === 'function') {
  window.db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
}

function initLoginGateFallback() {
  const ids = {
    pracownik: 'gateSekcjaPracownik',
    admin: 'gateSekcjaAdmin',
    developer: 'gateSekcjaDeveloper'
  };

  if (typeof window.przelaczZakladkeGate !== 'function') {
    window.przelaczZakladkeGate = function (tab) {
      Object.entries(ids).forEach(([name, id]) => {
        const section = document.getElementById(id);
        if (section) section.classList.toggle('hidden', name !== tab);
      });

      document.getElementById('gateSekcjaRejestracjaPracownika')?.classList.add('hidden');
      document.getElementById('gateResetPinBox')?.classList.add('hidden');

      const pracownikBtn = document.getElementById('btnGateTabPracownik');
      const adminBtn = document.getElementById('btnGateTabAdmin');
      [pracownikBtn, adminBtn].forEach((button) => {
        if (!button) return;
        button.classList.remove('bg-white', 'text-slate-900', 'shadow-xs');
        button.classList.add('text-slate-600');
      });
      const active = tab === 'admin' ? adminBtn : tab === 'pracownik' ? pracownikBtn : null;
      if (active) {
        active.classList.add('bg-white', 'text-slate-900', 'shadow-xs');
        active.classList.remove('text-slate-600');
      }
      document.getElementById('gateTabs')?.classList.remove('hidden');
    };
  }

  if (typeof window.otworzRejestracjePracownika !== 'function') {
    window.otworzRejestracjePracownika = () => {
      document.getElementById('gateSekcjaPracownik')?.classList.add('hidden');
      document.getElementById('gateSekcjaRejestracjaPracownika')?.classList.remove('hidden');
    };
  }
  if (typeof window.zamknijRejestracjePracownika !== 'function') {
    window.zamknijRejestracjePracownika = () => {
      document.getElementById('gateSekcjaRejestracjaPracownika')?.classList.add('hidden');
      document.getElementById('gateSekcjaPracownik')?.classList.remove('hidden');
    };
  }
  if (typeof window.otworzResetPinModal !== 'function') {
    window.otworzResetPinModal = () => document.getElementById('gateResetPinBox')?.classList.remove('hidden');
  }
  if (typeof window.zamknijResetPinModal !== 'function') {
    window.zamknijResetPinModal = () => document.getElementById('gateResetPinBox')?.classList.add('hidden');
  }

  function setGateError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function clearGateError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  async function completeGateLogin(email, pin, requiredRole, rememberId) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPin = String(pin || '').trim();
    if (!normalizedEmail || !normalizedPin) throw new Error('Podaj e-mail i kod PIN.');
    if (!window.db || !window.db.auth) throw new Error('Klient Supabase nie został załadowany. Odśwież stronę.');

    // PIN is the password in the initial onboarding/registration flow.
    const { data, error } = await window.db.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPin
    });
    if (error) throw error;

    const user = data?.user;
    if (!user) throw new Error('Nie udało się utworzyć sesji użytkownika.');

    let profile = null;
    const { data: profileRows, error: profileError } = await window.db
      .from('profiles')
      .select('org_id,role,status,email,full_name,assigned_locations')
      .eq('id', user.id)
      .limit(1);

    if (!profileError) profile = profileRows?.[0] || null;

    if (profile && profile.status && profile.status !== 'active') {
      await window.db.auth.signOut();
      throw new Error('Konto oczekuje na aktywację przez administratora.');
    }

    if (profile && requiredRole === 'admin' && !['admin', 'manager'].includes(profile.role)) {
      await window.db.auth.signOut();
      throw new Error('To konto nie ma uprawnień administratora.');
    }

    if (profile && requiredRole === 'staff' && profile.role === 'admin') {
      await window.db.auth.signOut();
      throw new Error('To konto ma rolę administratora. Zaloguj się w zakładce Administrator.');
    }

    window.localStorage.setItem('sf_active_session', JSON.stringify({
      user,
      profile,
      remember: document.getElementById(rememberId)?.checked !== false,
      loggedAt: new Date().toISOString()
    }));

    document.getElementById('authGateOverlay')?.classList.add('hidden');
    document.getElementById('appHeader')?.classList.remove('hidden');
    document.getElementById('appMain')?.classList.remove('hidden');

    window.dispatchEvent(new CustomEvent('smakflow-login', { detail: { user, profile } }));
  }

  if (typeof window.zalogujAdminaZGate !== 'function') {
    window.zalogujAdminaZGate = async function () {
      clearGateError('gateAdminBlad');
      try {
        await completeGateLogin(
          document.getElementById('gateAdminEmail')?.value,
          document.getElementById('gateAdminPin')?.value,
          'admin',
          'gateZapamietajAdmina'
        );
      } catch (error) {
        setGateError('gateAdminBlad', error?.message || 'Nie udało się zalogować administratora.');
      }
    };
  }

  if (typeof window.zalogujPracownikaZGate !== 'function') {
    window.zalogujPracownikaZGate = async function () {
      clearGateError('gatePracownikBlad');
      try {
        await completeGateLogin(
          document.getElementById('gatePracownikEmail')?.value,
          document.getElementById('gatePracownikPin')?.value,
          'staff',
          'gateZapamietajPracownika'
        );
      } catch (error) {
        setGateError('gatePracownikBlad', error?.message || 'Nie udało się zalogować pracownika.');
      }
    };
  }

  document.querySelectorAll('#authGateOverlay button').forEach((button) => {
    button.style.pointerEvents = 'auto';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginGateFallback);
} else {
  initLoginGateFallback();
}

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

// Uzupełnij swoimi danymi projektu Supabase (anon key jest publiczny, sekrety API trzymaj w Edge Functions)
export const SUPABASE_CONFIG = {
  url: window.__SMAKFLOW_SUPABASE_URL__ || 'https://bxmgiigbaxzmqcgjiulh.supabase.co',
  anonKey: window.__SMAKFLOW_SUPABASE_ANON_KEY__ || 'sb_publishable_Vu5qlLsoquae30Rw6SA4Ug_UqI7ugEU',
  functions: {
    apiProxy: 'api-proxy',
    iposSync: 'ipos-sync'
  }
};

// Udostępnienie globalne dla dowolnego pliku index.html (także klasycznych skryptów bez import)
window.APP_CONFIG = APP_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.__SMAKFLOW_SUPABASE_URL__ = SUPABASE_CONFIG.url;
window.__SMAKFLOW_SUPABASE_ANON_KEY__ = SUPABASE_CONFIG.anonKey;

if (window.supabase && typeof window.supabase.createClient === 'function') {
  window.db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

// Awaryjna naprawa bramy logowania: nie wymaga, aby funkcje były zdefiniowane
// globalnie przez duży inline <script> na końcu index.html. Dzięki temu zakładki
// i formularze działają także po częściowym błędzie/ładowaniu aplikacji.
function initLoginGateFallback() {
  const ids = {
    pracownik: 'gateSekcjaPracownik',
    admin: 'gateSekcjaAdmin',
    developer: 'gateSekcjaDeveloper'
  };

  if (typeof window.przelaczZakladkeGate !== 'function') {
    window.przelaczZakladkeGate = function (tab) {
      Object.entries(ids).forEach(([name, id]) => {
        const section = document.getElementByElementById(id);
        if (section) section.classList.toggle('hidden', name !== tab);
      });

      const reg = document.getElementById('gateSekcjaRejestracjaPracownika');
      const pracownikBtn = document.getElementById('btnGateTabPracownik');
      const adminBtn = document.getElementById('btnGateTabAdmin');

      if (reg) reg.classList.add('hidden');

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

      const gateTabs = document.getElementById('gateTabs');
      if (gateTabs) gateTabs.classList.remove('hidden');
    };
  }

  if (typeof window.otworzRejestracjePracownika !== 'function') {
    window.otworzRejestracjePracownika = function () {
      const form = document.getElementById('gateSekcjaRejestracjaPracownika');
      const pracownik = document.getElementById('gateSekcjaPracownik');
      if (pracownik) pracownik.classList.add('hidden');
      if (form) form.classList.remove('hidden');
    };
  }

  if (typeof window.zamknijRejestracjePracownika !== 'function') {
    window.zamknijRejestracjePracownika = function () {
      const form = document.getElementById('gateSekcjaRejestracjaPracownika');
      const pracownik = document.getElementById('gateSekcjaPracownik');
      if (form) form.classList.add('hidden');
      if (pracownik) pracownik.classList.remove('hidden');
    };
  }

  if (typeof window.otworzResetPinModal !== 'function') {
    window.otworzResetPinModal = function () {
      const box = document.getElementById('gateResetPinBox');
      if (box) box.classList.toggle('hidden');
    };
  }

  if (typeof window.zamknijResetPinModal !== 'function') {
    window.zamknijResetPinModal = function () {
      const box = document.getElementById('gateResetPinBox');
      if (box) box.classList.add('hidden');
    };
  }

  // Usuń ewentualny blokujący stan dla tabletów i obsługa przycisków kliknięciem
  // oraz dotykiem; poniższa delegacja nie zastępuje istniejących handlerów.
  document.querySelectorAll('#authGateOverlay button').forEach((button) => {
    button.style.pointerEvents = 'auto';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginGateFallback);
} else {
  initLoginGateFallback();
}

// js/bridge.js — Wspólny most łączący dowolny index.html z Supabase Edge Functions i walidacją grafiku
import { SUPABASE_CONFIG } from './config.js';

window.SmakFlowBridge = {
  sprawdzKonfliktZmiany(harmonogram, dzienIdx, numerZmiany, kandydat, godzinyZmianObj) {
    if (!kandydat) return null;
    const poz = harmonogram[dzienIdx];
    if (!poz) return null;
    const inne = numerZmiany === 1 ? (poz.zmiana2Lista || []) : (poz.zmiana1Lista || []);
    if (inne.includes(kandydat)) {
      return `${kandydat} ma już przypisaną drugą zmianę w dniu ${poz.dzien}.`;
    }
    const toMin = (hhmm, fallback) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : fallback;
    };
    const z1Start = toMin(godzinyZmianObj?.z1Od, 600);
    const z2End = toMin(godzinyZmianObj?.z2Do, 1320);

    if (numerZmiany === 1 && dzienIdx > 0) {
      const wczoraj = harmonogram[dzienIdx - 1];
      if (wczoraj && (wczoraj.zmiana2Lista || []).includes(kandydat) && z2End >= 1200 && z1Start <= 660) {
        return `Zbyt krótki odpoczynek dobowy dla ${kandydat} między ${wczoraj.dzien} (zmiana 2) a ${poz.dzien} (zmiana 1).`;
      }
    }
    if (numerZmiany === 2 && dzienIdx < harmonogram.length - 1) {
      const jutro = harmonogram[dzienIdx + 1];
      if (jutro && (jutro.zmiana1Lista || []).includes(kandydat) && z2End >= 1200 && z1Start <= 660) {
        return `Zbyt krótki odpoczynek dobowy dla ${kandydat} między ${poz.dzien} (zmiana 2) a ${jutro.dzien} (zmiana 1).`;
      }
    }
    return null;
  },

  async wywolajEdgeFunction(nazwaFunkcji, payload) {
    if (!window.db || !window.db.functions) {
      throw new Error('Klient Supabase Functions jest niedostępny.');
    }
    const { data, error } = await window.db.functions.invoke(nazwaFunkcji, { body: payload });
    if (error) throw error;
    return data;
  },

  async publikujSocialPrzezEdge(postObj, obrazBase64, orgName) {
    return this.wywolajEdgeFunction(SUPABASE_CONFIG.functions.apiProxy, {
      action: 'publish_social',
      organizacja: orgName,
      lokal: postObj.lokal,
      platformy: { facebook: postObj.fb, instagram: postObj.ig },
      tresc_fb: postObj.trescFb,
      tresc_ig: postObj.trescIg,
      obraz_url: postObj.obrazUrl || null,
      obraz_base64: obrazBase64
    });
  },

  async pobierzIposPrzezEdge(dateFrom, dateTo, locationId, terminalId) {
    return this.wywolajEdgeFunction(SUPABASE_CONFIG.functions.iposSync, {
      dateFrom,
      dateTo,
      locationId,
      terminalId: terminalId || ''
    });
  }
};

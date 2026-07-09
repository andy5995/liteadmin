import { el, clear, toast, download } from './util.js';
import { t } from './i18n.js';
import { Api } from './api.js';

const registry = { startCards: [], tabs: [] };
let loading = null;

export function pluginStartCards() { return registry.startCards; }
export function pluginTabs() { return registry.tabs; }

function makeApi(p) {
  return {
    name: p.name,
    label: p.label,
    version: p.version,
    el, clear, toast, download, t,
    call: (action, params = {}) => Api.plugin(p.name, action, params),
    addStartCard: card => registry.startCards.push({ plugin: p.name, ...card }),
    addTab: tab => registry.tabs.push({ plugin: p.name, ...tab }),
  };
}

export function ensurePluginsLoaded() {
  if (loading) return loading;
  loading = (async () => {
    let list = [];
    try { list = (await Api.plugins()).plugins || []; } catch (_) { return; }
    for (const p of list) {
      if (!p.client) continue;
      try {
        const mod = await import(new URL(p.client, document.baseURI).href);
        const reg = mod.register || mod.default;
        if (typeof reg === 'function') reg(makeApi(p));
      } catch (e) {
        console.error('LiteAdmin: failed to load plugin', p.name, e);
      }
    }
  })();
  return loading;
}

export function register(api) {
  const { el, clear, toast } = api;

  api.addStartCard({
    icon: 'key',
    title: api.label,
    subtitle: 'Issue read/write API keys for other plugins',
    onOpen: () => keysDialog(),
  });

  function scopeChip(scope) {
    return el('span', { class: 'chip tiny' + (scope === 'write' ? ' primary' : ''), text: scope });
  }

  function fmtTs(ts) { return ts ? new Date(ts * 1000).toLocaleString() : '—'; }

  function keysDialog() {
    const label = el('input', { type: 'text', placeholder: 'Label (e.g. mobile app)' });
    const scope = el('select', {}, [
      el('option', { value: 'read', text: 'read' }),
      el('option', { value: 'write', text: 'read + write' }),
    ]);
    const listEl = el('div', { class: 'hist-picker' });
    const revealed = el('div', {});

    const dlg = el('dialog', { class: 'large fit', 'aria-label': api.label }, [
      el('h5', { text: api.label }),
      el('p', { class: 'small-text', text: 'Keys are shown once, then stored hashed. Present them as "X-Api-Key: <key>" or "Authorization: Bearer <key>".' }),
      el('nav', { class: 'wrap toolbar' }, [
        el('div', { class: 'field label border max' }, [label, el('label', { text: 'Label' })]),
        el('div', { class: 'field label suffix border' }, [scope, el('label', { text: 'Scope' })]),
        el('button', { onClick: create }, [el('i', { text: 'add' }), el('span', { text: 'Create key' })]),
      ]),
      revealed,
      listEl,
      el('nav', { class: 'right-align' }, [el('button', { class: 'border', text: 'Close', onClick: () => dlg.remove() })]),
    ]);

    async function refresh() {
      clear(listEl);
      let keys = [];
      try { keys = (await api.call('list')).keys || []; } catch (e) { toast(e.message, true); return; }
      if (!keys.length) { listEl.append(el('p', { class: 'small-text', text: 'No keys yet.' })); return; }
      for (const k of keys) {
        listEl.append(el('article', { class: 'history-item round border' }, [
          el('div', { class: 'row' }, [
            el('b', { text: k.label }), scopeChip(k.scope), el('div', { class: 'max' }),
            el('button', { class: 'circle small transparent', 'aria-label': 'Revoke', onClick: () => revoke(k.id) }, [el('i', { text: 'delete' })]),
          ]),
          el('div', { class: 'small-text', text: 'created ' + fmtTs(k.created) + ' · last used ' + fmtTs(k.last_used) }),
        ]));
      }
    }

    async function create() {
      if (!label.value.trim()) return toast('Label required', true);
      try {
        const d = await api.call('create', { label: label.value.trim(), scope: scope.value });
        label.value = '';
        clear(revealed);
        const keyField = el('input', { type: 'text', value: d.key, readonly: true });
        revealed.append(el('article', { class: 'round border', style: 'margin:.5rem 0;padding:.85rem 1rem' }, [
          el('div', { class: 'small-text', text: 'New key (' + d.scope + ') — copy it now, it will not be shown again:' }),
          el('div', { class: 'row' }, [
            el('div', { class: 'field border max' }, [keyField]),
            el('button', { class: 'small', onClick: () => { if (navigator.clipboard) navigator.clipboard.writeText(d.key); toast('Copied'); } }, [el('i', { text: 'content_copy' }), el('span', { text: 'Copy' })]),
          ]),
        ]));
        refresh();
      } catch (e) { toast(e.message, true); }
    }

    async function revoke(id) {
      try { await api.call('revoke', { id }); refresh(); } catch (e) { toast(e.message, true); }
    }

    document.body.append(dlg);
    dlg.showModal();
    refresh();
  }
}

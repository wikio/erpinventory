/**
 * SARI Système - Shared sortable table-column helper.
 * Provides consistent clickable column headers with a clear direction indicator
 * across every list in the app (products, invoices, quotes, orders, clients,
 * suppliers, stock, lots, tenders, reports, ...).
 */
const TableSort = {
  state: {},

  get(moduleKey) {
    return this.state[moduleKey] || { field: '', dir: 'asc' };
  },

  /** Ensure a default sort field/direction exists (used for the page-load default). */
  ensure(moduleKey, field, dir = 'asc') {
    const s = this.get(moduleKey);
    if (!s.field) { s.field = field; s.dir = dir; this.state[moduleKey] = s; }
  },

  toggle(moduleKey, field) {
    const s = this.get(moduleKey);
    if (s.field === field) {
      s.dir = s.dir === 'asc' ? 'desc' : 'asc';
    } else {
      s.field = field;
      s.dir = 'asc';
    }
    this.state[moduleKey] = s;
  },

  /** Sort a shallow copy of rows by the active field (or defaultField when none). */
  apply(moduleKey, rows, defaultField = '') {
    const s = this.get(moduleKey);
    const field = s.field || defaultField || '';
    if (!field || !Array.isArray(rows)) return rows ? rows.slice() : [];
    const dir = s.dir === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => {
      let av = a ? a[field] : undefined;
      let bv = b ? b[field] : undefined;
      if (av instanceof Date) av = av.getTime();
      if (bv instanceof Date) bv = bv.getTime();
      const an = typeof av === 'number' ? av : (av == null ? '' : String(av).toLocaleLowerCase());
      const bn = typeof bv === 'number' ? bv : (bv == null ? '' : String(bv).toLocaleLowerCase());
      if (an < bn) return -1 * dir;
      if (an > bn) return 1 * dir;
      return 0;
    });
  },

  arrow(moduleKey, field) {
    const s = this.get(moduleKey);
    if (s.field !== field) return '';
    return s.dir === 'asc' ? ' ▲' : ' ▼';
  },

  /**
   * Render a sortable <th>. `renderCall` is the JS expression used to re-render
   * the owning list after toggling (e.g. "SalesModule.render()").
   */
  th(moduleKey, field, label, renderCall, cls = 'p-3') {
    const arrow = this.arrow(moduleKey, field);
    return `<th class="${cls} cursor-pointer select-none whitespace-nowrap hover:text-sari-blue" data-sort-field="${field}" title="${SariUtils.escapeHtml(String(label))}" onclick="TableSort.toggle('${moduleKey}','${field}');${renderCall}">${label}<span class="sort-arrow text-sari-blue font-black">${arrow}</span></th>`;
  }
};

if (typeof window !== 'undefined') {
  window.TableSort = TableSort;
}

export {};

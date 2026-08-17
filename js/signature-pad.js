/**
 * SARI Système — Canvas signature widget (Sections 320/321).
 * Hand-drawn signatures captured with mouse / touch / stylus, stored as PNG
 * data-URLs inside the contract/certificate signature blocks and PDFs.
 */
const SignaturePad = {
  size: { width: 600, height: 150 },
  state: new Map(),
  html(id, label = '', initial = '') {
    return `<div class="signature-pad" data-signature-pad="${id}">
      ${label ? `<label class="doc-label">${SariUtils.escapeHtml(label)}</label>` : ''}
      <div class="signature-pad-canvas-wrap" style="position:relative">
        <canvas id="${id}" width="${this.size.width}" height="${this.size.height}" style="touch-action:none;width:100%;height:${this.size.height / 3}px;border:1.5px dashed #94a3b8;border-radius:10px;background:repeating-linear-gradient(0deg,#fff,#fff 26px,#f1f5f9 27px);cursor:crosshair"></canvas>
        <span class="signature-pad-hint" style="position:absolute;pointer-events:none;color:#94a3b8;font-size:11px;transform:translate(-50%,-50%)">${i18n.t('signHere', 'Signez ici (souris / doigt / stylet)')}</span>
      </div>
      <div class="flex items-center gap-2 mt-2">
        <button type="button" onclick="SignaturePad.clear('${id}')" class="sari-btn px-3 py-1.5 bg-slate-200 text-xs"><i data-lucide="eraser" class="w-3 h-3"></i>${i18n.t('clearSignature', 'Effacer')}</button>
      </div>
      <input type="hidden" id="${id}-value" value="">
    </div>`;
  },
  mount(root = document) {
    root.querySelectorAll('[data-signature-pad]').forEach((wrap) => {
      const id = wrap.dataset.signaturePad;
      if (!id || this.state.has(id)) return;
      const canvas = wrap.querySelector('canvas');
      if (!canvas) return;
      const initial = wrap.dataset.initial || '';
      this.setup(id, canvas, initial);
    });
  },
  setup(id, canvas, initial = '') {
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    const entry = { drawn: false };
    this.state.set(id, entry);
    if (initial) {
      const image = new Image();
      image.onload = () => { ctx.drawImage(image, 0, 0, canvas.width, canvas.height); entry.drawn = true; this.syncHidden(id); };
      image.src = initial;
    }
    const point = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    };
    let drawing = false;
    const start = (event) => {
      event.preventDefault();
      if (event.pointerType === 'mouse' && event.buttons !== 1) return;
      drawing = true;
      entry.drawn = true;
      const p = point(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      canvas.setPointerCapture?.(event.pointerId);
      this.hideHint(canvas);
    };
    const move = (event) => {
      if (!drawing) return;
      event.preventDefault();
      const p = point(event);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const end = (event) => {
      if (!drawing) return;
      drawing = false;
      this.syncHidden(id);
    };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', end);
  },
  hideHint(canvas) { const hint = canvas.parentElement?.querySelector('.signature-pad-hint'); if (hint) hint.style.display = 'none'; },
  syncHidden(id) {
    const canvas = document.getElementById(id);
    const hidden = document.getElementById(`${id}-value`);
    if (hidden && canvas) hidden.value = this.state.get(id)?.drawn ? canvas.toDataURL('image/png') : '';
  },
  value(id) {
    const entry = this.state.get(id);
    if (!entry?.drawn) return '';
    const canvas = document.getElementById(id);
    return canvas ? canvas.toDataURL('image/png') : '';
  },
  isEmpty(id) { return !this.state.get(id)?.drawn; },
  clear(id) {
    const canvas = document.getElementById(id);
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const entry = this.state.get(id);
      if (entry) entry.drawn = false;
      this.syncHidden(id);
      const hint = canvas.parentElement?.querySelector('.signature-pad-hint');
      if (hint) hint.style.display = '';
    }
  },
};
window.SignaturePad = SignaturePad;
export {};

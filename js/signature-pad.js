/** Mouse/touch/stylus hand-drawn signature capture shared by contracts and certificates. */
const SariSignaturePad = {
  pads: new Map(),
  mount(id, existing = '') {
    const canvas = document.getElementById(id); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || 560; const height = canvas.clientHeight || 150;
    canvas.width = width * ratio; canvas.height = height * ratio; ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
    const state = { canvas, ctx, drawing: false, dirty: false, width, height };
    const point = (event) => { const r = canvas.getBoundingClientRect(); const p = event.touches?.[0] || event.changedTouches?.[0] || event; return { x: p.clientX - r.left, y: p.clientY - r.top }; };
    const start = (event) => { event.preventDefault(); const p = point(event); state.drawing = true; state.dirty = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (event) => { if (!state.drawing) return; event.preventDefault(); const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const stop = (event) => { if (!state.drawing) return; event?.preventDefault(); state.drawing = false; ctx.closePath(); };
    canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
    canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', stop, { passive: false });
    this.pads.set(id, state);
    if (existing) { const image = new Image(); image.onload = () => { ctx.drawImage(image, 0, 0, width, height); state.dirty = true; }; image.src = existing; }
  },
  clear(id) { const s = this.pads.get(id); if (!s) return; s.ctx.clearRect(0, 0, s.width, s.height); s.dirty = false; },
  value(id) { const s = this.pads.get(id); return s?.dirty ? s.canvas.toDataURL('image/png') : ''; },
  field(id, label = 'Signature manuscrite', existing = '') {
    return `<div class="doc-label md:col-span-2"><span>${SariUtils.escapeHtml(label)} *</span><div class="signature-pad-frame"><canvas id="${id}" class="signature-pad-canvas" aria-label="${SariUtils.escapeHtml(label)}"></canvas><button type="button" class="signature-pad-clear" onclick="SariSignaturePad.clear('${id}')"><i data-lucide="eraser"></i> Effacer</button></div>${existing ? '<small class="text-green-600">La signature enregistrée est affichée et peut être redessinée.</small>' : '<small class="text-slate-400">Signez avec la souris, le doigt ou un stylet.</small>'}</div>`;
  },
};
window.SariSignaturePad = SariSignaturePad;
export { SariSignaturePad };

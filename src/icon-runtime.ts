let scheduled = false;

function hasPendingIcons(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return node.matches('i[data-lucide]') || Boolean(node.querySelector('i[data-lucide]'));
}

function hydrate(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    try {
      if (document.querySelector('i[data-lucide]')) window.lucide?.createIcons();
    } catch (error) {
      console.error('[Icons] Hydration failed:', error);
    }
  });
}

window.SariIcons = { hydrate };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate, { once: true });
else hydrate();

new MutationObserver((records) => {
  if (records.some((record) => [...record.addedNodes].some(hasPendingIcons))) hydrate();
}).observe(document.documentElement, { childList: true, subtree: true });

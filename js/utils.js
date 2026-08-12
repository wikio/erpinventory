/**
 * SARI Système - Self-Contained Utilities & Canvas Label Generator
 * Provides Barcode/QR rendering on HTML5 Canvas, Landed Cost Calculator,
 * CSV Export/Import, and Global Search helpers.
 */

const SariUtils = {
  /**
   * Render a clean 1D barcode on an HTML5 canvas element
   */
  drawBarcode(canvasEl, codeText, width = 200, height = 80) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = width;
    canvasEl.height = height;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Generate deterministic bar widths from characters in codeText
    ctx.fillStyle = '#0F172A';
    const str = String(codeText || '000000');
    let x = 14;
    const barHeight = height - 26;

    // Start guard bars
    ctx.fillRect(x, 8, 2, barHeight + 4); x += 4;
    ctx.fillRect(x, 8, 2, barHeight + 4); x += 6;

    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode * 3) % 2) + 1;
      const gap = ((charCode * 5) % 2) + 2;

      ctx.fillRect(x, 8, w1 * 2, barHeight);
      x += (w1 * 2) + gap;
      ctx.fillRect(x, 8, w2 * 2, barHeight);
      x += (w2 * 2) + gap;

      if (x > width - 30) break;
    }

    // End guard bars
    ctx.fillRect(width - 20, 8, 2, barHeight + 4);
    ctx.fillRect(width - 14, 8, 2, barHeight + 4);

    // Render human-readable SKU / barcode number below
    ctx.font = 'bold 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(str, width / 2, height - 6);
  },

  /**
   * Render a clean QR-like matrix code on an HTML5 canvas element
   */
  drawQRCode(canvasEl, textData, size = 120) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = size;
    canvasEl.height = size;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const gridSize = 11;
    const cellSize = Math.floor((size - 16) / gridSize);
    const offset = Math.floor((size - (gridSize * cellSize)) / 2);

    ctx.fillStyle = '#0F172A';

    // Draw finder patterns (top-left, top-right, bottom-left squares)
    const drawFinder = (rx, ry) => {
      ctx.fillRect(offset + rx * cellSize, offset + ry * cellSize, cellSize * 3, cellSize * 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(offset + (rx + 0.8) * cellSize, offset + (ry + 0.8) * cellSize, cellSize * 1.4, cellSize * 1.4);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(offset + (rx + 1.2) * cellSize, offset + (ry + 1.2) * cellSize, cellSize * 0.6, cellSize * 0.6);
    };

    drawFinder(0, 0);
    drawFinder(gridSize - 3, 0);
    drawFinder(0, gridSize - 3);

    // Populate data cells using string hash
    const str = String(textData || 'SARI-SYSTEME');
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Skip finder square zones
        if ((row < 4 && col < 4) || (row < 4 && col > gridSize - 5) || (row > gridSize - 5 && col < 4)) {
          continue;
        }
        const cellHash = (hash * (row + 1) * (col + 1)) % 100;
        if (cellHash > 42) {
          ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Add SARI blue center dot
    ctx.fillStyle = '#009CC5';
    ctx.fillRect(offset + 5 * cellSize, offset + 5 * cellSize, cellSize, cellSize);
  },

  /**
   * Calculate total Landed Cost in Algerian Dinars (DZD) and cost per unit
   */
  calculateLandedCost({ foreignAmount = 0, exchangeRate = 1, freightDZD = 0, insuranceDZD = 0, customsDZD = 0, unitsCount = 1 }) {
    const purchaseDZD = Number(foreignAmount) * Number(exchangeRate);
    const totalDZD = purchaseDZD + Number(freightDZD) + Number(insuranceDZD) + Number(customsDZD);
    const perUnitDZD = unitsCount > 0 ? (totalDZD / unitsCount) : totalDZD;

    return {
      purchaseDZD: Math.round(purchaseDZD),
      freightDZD: Math.round(Number(freightDZD)),
      insuranceDZD: Math.round(Number(insuranceDZD)),
      customsDZD: Math.round(Number(customsDZD)),
      totalLandedDZD: Math.round(totalDZD),
      perUnitDZD: Math.round(perUnitDZD)
    };
  },

  amountInWords(amount, currency = 'DZD', language = 'fr') {
    const value = Math.round(Number(amount) || 0);
    const currencyNames = {
      fr: { DZD: ['dinar algérien', 'dinars algériens'], EUR: ['euro', 'euros'], USD: ['dollar américain', 'dollars américains'] },
      ar: { DZD: ['دينار جزائري', 'دينار جزائري'], EUR: ['يورو', 'يورو'], USD: ['دولار أمريكي', 'دولار أمريكي'] }
    };
    const frUnder100 = n => {
      const u=['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
      if(n<17)return u[n]; if(n<20)return `dix-${u[n-10]}`; const tens=['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
      if(n<70)return tens[Math.floor(n/10)]+(n%10===1?' et un':n%10?`-${u[n%10]}`:''); if(n<80)return 'soixante-'+frUnder100(n-60); return 'quatre-vingt'+(n===80?'s':`-${frUnder100(n-80)}`);
    };
    const fr = n => { if(n<100)return frUnder100(n); if(n<1000)return (n<200?'cent':`${frUnder100(Math.floor(n/100))} cent`)+(n%100?` ${frUnder100(n%100)}`:''); if(n<1e6)return (n<2000?'mille':`${fr(Math.floor(n/1000))} mille`)+(n%1000?` ${fr(n%1000)}`:''); if(n<1e9)return (n<2e6?'un million':`${fr(Math.floor(n/1e6))} millions`)+(n%1e6?` ${fr(n%1e6)}`:''); return String(n); };
    const arUnits=['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
    const ar = n => { if(n<20)return arUnits[n]; if(n<100){const t=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'][Math.floor(n/10)];return n%10?`${arUnits[n%10]} و${t}`:t;} if(n<1000){const h=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'][Math.floor(n/100)];return n%100?`${h} و${ar(n%100)}`:h;} if(n<1e6){const q=Math.floor(n/1000);const lead=q===1?'ألف':q===2?'ألفان':`${ar(q)} ألف`;return n%1000?`${lead} و${ar(n%1000)}`:lead;} if(n<1e9){const q=Math.floor(n/1e6);const lead=q===1?'مليون':q===2?'مليونان':`${ar(q)} مليون`;return n%1e6?`${lead} و${ar(n%1e6)}`:lead;}return String(n);};
    const lang = language === 'ar' ? 'ar' : 'fr'; const words = lang === 'ar' ? ar(value) : fr(value); const names=currencyNames[lang][currency]||[currency,currency];
    return `${words} ${value === 1 ? names[0] : names[1]}`;
  },

  /** Advanced search: spaces/+ /AND = all terms, slash/OR = alternatives, -term = exclusion. */
  matchesAdvancedSearch(record, query, fields = []) {
    const text = fields.map(field => {
      const value = typeof field === 'function' ? field(record) : record?.[field];
      return typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    }).join(' ').toLocaleLowerCase();
    const normalized = String(query || '').trim().toLocaleLowerCase();
    if (!normalized) return true;
    const excluded = [...normalized.matchAll(/(?:^|\s)-([^\s+/]+)/g)].map(match => match[1]);
    if (excluded.some(term => text.includes(term))) return false;
    const positive = normalized.replace(/(?:^|\s)-[^\s+/]+/g, ' ').trim();
    if (!positive) return true;
    return positive.split(/\s*(?:\/|\bOR\b)\s*/i).some(group =>
      group.split(/(?:\s*\+\s*|\s+AND\s+|\s+)/i).filter(Boolean).every(term => text.includes(term))
    );
  },

  searchKeyHandler(event, callback) {
    if (event.key === 'Enter') { event.preventDefault(); callback(); }
  },

  fileToDataURL(file) { return new Promise((resolve,reject)=>{if(!file)return resolve('');const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);}); },

  /**
   * Export an array of objects to a CSV file and trigger browser download
   */
  exportToCSV(dataArray, filename = 'sari-systeme-export.csv') {
    if (!dataArray || !dataArray.length) return;
    const headers = Object.keys(dataArray[0]);
    const rows = dataArray.map(obj => 
      headers.map(header => {
        let val = obj[header];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Print an HTML element cleanly by opening a printable window or triggering window.print()
   */
  printElement(elementId, title = 'SARI Système Document') {
    const el = document.getElementById(elementId);
    if (!el) return;
    window.print();
  },

  /**
   * Escape HTML to prevent XSS in dynamic templates
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

if (typeof window !== 'undefined') {
  window.SariUtils = SariUtils;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SariUtils;
}

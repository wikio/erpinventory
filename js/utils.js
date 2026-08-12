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
    const ctx=canvasEl.getContext('2d'), modules=29, quiet=4, total=modules+quiet*2, cell=Math.max(1,Math.floor(size/total)), actual=cell*total;
    canvasEl.width=actual;canvasEl.height=actual;canvasEl.dataset.encodedValue=String(textData||'');ctx.fillStyle='#fff';ctx.fillRect(0,0,actual,actual);
    const matrix=Array.from({length:modules},()=>Array(modules).fill(null));
    const finder=(row,col)=>{for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){if(row+y<0||col+x<0||row+y>=modules||col+x>=modules)continue;matrix[row+y][col+x]=(x>=0&&x<=6&&y>=0&&y<=6&&(x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4)));}};
    finder(0,0);finder(0,modules-7);finder(modules-7,0);for(let i=8;i<modules-8;i++){matrix[6][i]=i%2===0;matrix[i][6]=i%2===0;}
    const bytes=new TextEncoder().encode(String(textData||'SARI-SYSTEME')),bits=[];for(const b of bytes)for(let i=7;i>=0;i--)bits.push((b>>i)&1);let seed=0x811c9dc5;for(const b of bytes){seed^=b;seed=Math.imul(seed,0x01000193);}
    let bit=0;for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(matrix[row][col]===null){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;matrix[row][col]=Boolean((bits[bit++%Math.max(bits.length,1)]||0)^((seed>>>0)&1)^((row+col)%3===0));}
    ctx.fillStyle='#000';for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(matrix[row][col])ctx.fillRect((col+quiet)*cell,(row+quiet)*cell,cell,cell);
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

  parseDiscount(input, baseAmount = 0) {
    const raw=String(input??'').trim().replace(',','.');const isPercentage=raw.endsWith('%');const value=Math.max(0,Number(raw.replace('%',''))||0);const base=Math.max(0,Number(baseAmount)||0);const amount=isPercentage?Math.min(base,base*value/100):Math.min(base,value);return { expression: raw || '0', type:isPercentage?'percentage':'fixed', value, amount, percentage:base?amount/base*100:0 };
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

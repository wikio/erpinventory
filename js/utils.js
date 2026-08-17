/**
 * SARI Système - Self-Contained Utilities & Canvas Label Generator
 * Provides Barcode/QR rendering on HTML5 Canvas, Landed Cost Calculator,
 * CSV Export/Import, and Global Search helpers.
 */

const SariUtils = {
  /**
   * Render a clean 1D barcode on an HTML5 canvas element
   */
  /** Render a barcode into an image data URL (used for PDF/print and template merge fields). */
  barcodeImageDataUrl(codeText, width = 180, height = 55) {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    this.drawBarcode(c, codeText, width, height);
    return c.toDataURL('image/png');
  },

  /** Render a QR code into an image data URL (used for PDF/print and template merge fields). */
  qrImageDataUrl(textData, size = 88) {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    this.drawQRCode(c, textData, size);
    return c.toDataURL('image/png');
  },

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

  deepClone(value) { return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value)); },
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

  /** Render an offscreen element to a canvas (used by the PDF pagination pipeline). */
  async elementToCanvas(node, paperFormat) {
    await window.SariVendors?.loadPdf();
    const clone = node.cloneNode(true);
    clone.querySelectorAll('.no-print,.hidden').forEach(x => x.remove());
    Object.assign(clone.style, { position:'fixed', left:'-10000px', top:'0', width:paperFormat==='Letter'?'816px':'794px', maxWidth:'none', maxHeight:'none', minHeight:'0', height:'auto', overflow:'visible', background:'#ffffff', padding:'0', margin:'0', border:'0', boxShadow:'none', transform:'none' });
    clone.querySelectorAll(':scope > *').forEach(child => Object.assign(child.style, { maxWidth:'100%', marginLeft:'0', marginRight:'0', transform:'none' }));
    document.body.appendChild(clone);
    const canvas = await html2canvas(clone, { scale:1.5, useCORS:true, backgroundColor:'#ffffff', windowWidth:clone.scrollWidth, windowHeight:clone.scrollHeight });
    clone.remove();
    return canvas;
  },

  async createPDFBlob(elementId,paperFormat='A4') {
    const element=document.getElementById(elementId);if(!element)throw Error('Printable element not found');
    await window.SariVendors?.loadPdf();if(!window.jspdf?.jsPDF||typeof html2canvas==='undefined')throw Error('PDF engine unavailable');
    const canvas=await this.elementToCanvas(element,paperFormat),format=paperFormat==='Letter'?'letter':'a4',pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format,compress:true}),pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=8,contentW=pageW-margin*2,ratio=contentW/canvas.width,imageH=canvas.height*ratio,image=canvas.toDataURL('image/jpeg',.95),capacity=pageH-margin*2;
    let consumed=0,page=0,totalPages=Math.max(1,Math.ceil(imageH/capacity));while(consumed<imageH){if(page++)pdf.addPage(format,'portrait');pdf.addImage(image,'JPEG',margin,margin-consumed,contentW,imageH,undefined,'FAST');pdf.setFillColor(255,255,255);pdf.rect(0,pageH-8,pageW,8,'F');pdf.setFontSize(8);pdf.setTextColor(100);pdf.text(`Page ${page}/${totalPages}`,pageW-margin,pageH-3,{align:'right'});consumed+=capacity;}
    return pdf.output('blob');
  },

  async downloadPDF(elementId, filename='sari-document.pdf', paperFormat='A4') {
    const element=document.getElementById(elementId);if(!element)return;
    try { await window.SariVendors?.loadPdf(); } catch (error) { console.warn('[PDF] Lazy engine load failed', error); }
    if(!window.jspdf?.jsPDF||typeof html2canvas==='undefined'){window.app?.showToast('Moteur PDF indisponible : ouverture de l’impression PDF.','warning');window.print();return;}
    const clone=element.cloneNode(true);
    // Canvas pixels are NOT cloned by cloneNode: convert barcode/QR canvases to <img> so html2canvas renders them.
    const srcCanvases=element.querySelectorAll('canvas'),cloneCanvases=clone.querySelectorAll('canvas');
    cloneCanvases.forEach((canvas,index)=>{try{const src=srcCanvases[index]||canvas;const image=document.createElement('img');image.src=src.toDataURL?src.toDataURL('image/png'):'';image.className=canvas.className;image.style.cssText=canvas.style.cssText;image.style.maxWidth='100%';if(canvas.width)image.width=canvas.width;if(canvas.height)image.height=canvas.height;canvas.replaceWith(image);}catch(_){canvas.remove();}});
    clone.querySelectorAll('.no-print,.hidden').forEach(node=>node.remove());
    // Dynamic pagination: extract repeating header / footer blocks and re-draw them on every page.
    const headerEl=clone.querySelector('.doc-header')||clone.querySelector('.document-print-header');
    const footerEl=clone.querySelector('.doc-footer')||clone.querySelector('.document-print-footer');
    if(headerEl)headerEl.remove();if(footerEl)footerEl.remove();
    Object.assign(clone.style,{position:'fixed',left:'-10000px',top:'0',width:paperFormat==='Letter'?'816px':'794px',maxWidth:'none',maxHeight:'none',minHeight:'0',height:'auto',overflow:'visible',background:'#fff',padding:'0',margin:'0',border:'0',boxShadow:'none',transform:'none'});clone.querySelectorAll(':scope > *').forEach(child=>Object.assign(child.style,{maxWidth:'100%',marginLeft:'0',marginRight:'0',transform:'none'}));document.body.appendChild(clone);
    const canvas=await html2canvas(clone,{scale:1.5,useCORS:true,backgroundColor:'#ffffff',windowWidth:clone.scrollWidth,windowHeight:clone.scrollHeight});clone.remove();
    // Render header/footer to their own canvases (they will be stamped on every page).
    let headerCanvas=null,footerCanvas=null;
    if(headerEl)headerCanvas=await this.elementToCanvas(headerEl,paperFormat).catch(()=>null);
    if(footerEl)footerCanvas=await this.elementToCanvas(footerEl,paperFormat).catch(()=>null);
    const format=paperFormat==='Letter'?'letter':'a4',pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format,compress:true}),pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),marginX=10,topMargin=10,bottomMargin=18,headerH=headerCanvas?(headerCanvas.height/(headerCanvas.width||1))*(pageW-marginX*2):0,footerH=footerCanvas?(footerCanvas.height/(footerCanvas.width||1))*(pageW-marginX*2):0,contentW=pageW-marginX*2,ratio=contentW/canvas.width,imgH=canvas.height*ratio,firstCapacity=pageH-topMargin-bottomMargin-footerH,continuationCapacity=pageH-topMargin-bottomMargin-headerH-footerH,totalPages=imgH<=firstCapacity?1:1+Math.ceil((imgH-firstCapacity)/continuationCapacity),img=canvas.toDataURL('image/jpeg',.95),headerImg=headerCanvas?.toDataURL('image/png'),footerImg=footerCanvas?.toDataURL('image/png'),reference=element.dataset.reference||filename.replace(/\.pdf$/i,''),company=element.dataset.company||'SARI Système',currency=element.dataset.currency||'DZD',total=new Intl.NumberFormat(i18n.currentLang==='ar'?'ar-DZ':'fr-DZ',{style:'currency',currency}).format(Number(element.dataset.total||0));
    let consumed=0;
    for(let page=1;page<=totalPages;page++){
      if(page>1)pdf.addPage(format,'portrait');const continuation=page>1,contentTop=topMargin+headerH,capacity=continuation?continuationCapacity:firstCapacity;
      pdf.addImage(img,'JPEG',marginX,contentTop-consumed,contentW,imgH,undefined,'FAST');
      pdf.setFillColor(255,255,255);pdf.rect(0,0,pageW,topMargin,'F');pdf.rect(0,pageH-bottomMargin-footerH,pageW,bottomMargin+footerH,'F');
      // Repeating header block on every page.
      if(headerImg)pdf.addImage(headerImg,'PNG',marginX,topMargin,contentW,headerH,undefined,'FAST');
      // Repeating footer block on every page.
      if(footerImg)pdf.addImage(footerImg,'PNG',marginX,pageH-bottomMargin-footerH,contentW,footerH,undefined,'FAST');
      if(!headerImg&&continuation){pdf.setTextColor(15,23,42);pdf.setFontSize(9);pdf.setFont('helvetica','bold');pdf.text(`${company} — Total: ${total} — ${reference} — Page ${page}/${totalPages}`,marginX,topMargin+5);pdf.setDrawColor(0,156,197);pdf.line(marginX,topMargin+8,pageW-marginX,topMargin+8);}
      pdf.setFontSize(8);pdf.setFont('helvetica','normal');pdf.setTextColor(100);pdf.text(`${reference} • ${page}/${totalPages}`,pageW-marginX,pageH-bottomMargin,{align:'right'});consumed+=capacity;
    }
    pdf.save(filename);
  },

  /** Collect app stylesheets + embed the @font-face rules (base64) so the print window keeps the correct typography. */
  async collectPrintAssets() {
    const parts = [];
    document.querySelectorAll('style').forEach(s => parts.push(s.outerHTML));
    document.querySelectorAll('link[rel="stylesheet"]').forEach(l => { if (l.href) parts.push(`<link rel="stylesheet" href="${this.escapeHtml(l.href)}">`); });
    const fonts = await this.embedFonts();
    if (fonts) parts.push(`<style>${fonts}</style>`);
    return parts.join('\n');
  },

  /** Embed every reachable @font-face rule (incl. @import'ed Google Fonts) as base64 data URIs. */
  async embedFonts() {
    const faces = [];
    const visit = sheet => {
      if (!sheet) return;
      let rules; try { rules = sheet.cssRules; } catch (_) { return; }
      if (!rules) return;
      for (const rule of Array.from(rules)) {
        try {
          if (rule.type === 3 && rule.styleSheet) visit(rule.styleSheet);
          else if (rule.type === 5 && rule.style && rule.style.getPropertyValue('src')) faces.push(rule);
        } catch (_) {}
      }
    };
    try { for (const sheet of Array.from(document.styleSheets || [])) visit(sheet); } catch (_) {}
    const out = [];
    for (const face of faces) {
      try {
        let src = face.style.getPropertyValue('src');
        const family = face.style.getPropertyValue('font-family');
        if (!family || !src) continue;
        for (const url of [...src.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)].map(m => m[2])) {
          try {
            const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (res.ok) {
              const blob = await res.blob();
              const dataUrl = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(blob); });
              src = src.replace(url, dataUrl);
            }
          } catch (_) {}
        }
        out.push(`@font-face{font-family:${family};font-style:${face.style.getPropertyValue('font-style') || 'normal'};font-weight:${face.style.getPropertyValue('font-weight') || '400'};font-display:swap;src:${src};}`);
      } catch (_) {}
    }
    return out.join('\n');
  },

  async openPrintWindow(elementId,paperFormat='A4',title='SARI Système Document'){const source=document.getElementById(elementId);if(!source)return;const clone=source.cloneNode(true);clone.querySelectorAll('.no-print,.hidden').forEach(node=>node.remove());const sourceCanvases=source.querySelectorAll('canvas'),cloneCanvases=clone.querySelectorAll('canvas');cloneCanvases.forEach((canvas,index)=>{try{const src=sourceCanvases[index]||canvas;const image=document.createElement('img');image.src=src.toDataURL?src.toDataURL('image/png'):'';image.className=canvas.className;image.style.cssText=canvas.style.cssText;image.style.maxWidth='100%';if(canvas.width)image.width=canvas.width;if(canvas.height)image.height=canvas.height;canvas.replaceWith(image);}catch(_){canvas.remove();}});const assets=await Promise.race([this.collectPrintAssets().catch(()=>''),new Promise(res=>setTimeout(()=>res(''),1500))]),popup=window.open('','_blank','width=1000,height=900');if(!popup)return app?.showToast?.('Autorisez les fenêtres contextuelles pour imprimer.','warning');popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(title)}</title>${assets}<style>@page{size:${paperFormat==='Letter'?'Letter':'A4'};margin:10mm}html,body{margin:0!important;padding:0!important;background:#fff!important}body{font-family:'Plus Jakarta Sans','IBM Plex Sans Arabic',Arial,sans-serif}.print-window-document{width:100%;max-width:none;margin:0;padding:0;box-shadow:none;border:0}.document-continuation-header{display:table-row}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}.no-print{display:none!important}.doc-body{padding-top:28mm;padding-bottom:18mm}@media print{html,body{width:100%!important;height:auto!important}body *{visibility:visible!important}.print-window-document,.print-window-document *{visibility:visible!important}.print-window-document{display:block!important;position:static!important}.sari-tile{box-shadow:none!important;border:0!important}.doc-header{position:fixed;top:0;left:0;right:0;margin:0!important;padding:8mm 10mm!important}.doc-footer{position:fixed;bottom:0;left:0;right:0;margin:0!important;padding:8mm 10mm!important}.doc-header,.doc-footer{background:#fff!important}}</style></head><body><main class="print-window-document">${clone.innerHTML}</main></body></html>`);popup.document.close();setTimeout(()=>{popup.focus();popup.print();},900);},
  printElement(elementId, title = 'SARI Système Document') { this.openPrintWindow(elementId,'A4',title); },

  /**
   * Build a verification/QR content URL from an admin-defined pattern.
   * Supported placeholders: {code} (reference), {reference}, {sku}, {barcode},
   * {hash} / {hashed_key}, {id} / {numericId}. Unknown placeholders are left intact.
   */
  buildVerificationUrl(pattern, data = {}) {
    const base = String(pattern || 'http://sari-systeme.com/verification/{code}/{hash}');
    const map = {
      '{code}': data.code ?? data.referenceCode ?? data.reference ?? '',
      '{reference}': data.referenceCode ?? data.reference ?? data.code ?? '',
      '{sku}': data.sku ?? '',
      '{barcode}': data.barcode ?? data.sku ?? '',
      '{hash}': data.hash ?? '',
      '{hashed_key}': data.hash ?? '',
      '{id}': data.id ?? '',
      '{numericId}': data.numericId ?? data.id ?? ''
    };
    return base.replace(/\{(code|reference|sku|barcode|hash|hashed_key|id|numericId)\}/g, (token) => encodeURIComponent(String(map[token] ?? '')));
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

export {};

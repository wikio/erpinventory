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

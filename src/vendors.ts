import { createIcons } from 'lucide';
import { sariIcons } from './icon-set';

// Lucide is required by the initial login shell. All other large vendors are
// loaded only at the point where their feature is invoked.
window.lucide = {
  createIcons: () => createIcons({ icons: sariIcons }),
};

let chartPromise: Promise<unknown> | undefined;
let pdfPromise: Promise<unknown> | undefined;
let spreadsheetPromise: Promise<typeof import('read-excel-file/browser')> | undefined;

window.SariVendors = {
  async loadCharts() {
    chartPromise ??= import('chart.js/auto').then((module) => {
      window.Chart = module.default;
      return module.default;
    });
    return chartPromise;
  },

  async readSpreadsheet(file: File) {
    spreadsheetPromise ??= import('read-excel-file/browser');
    const module = await spreadsheetPromise;
    return module.readSheet(file, { trim: true });
  },

  async loadPdf() {
    pdfPromise ??= Promise.all([import('jspdf'), import('html2canvas')]).then(([jspdf, canvas]) => {
      window.jspdf = jspdf;
      window.html2canvas = canvas.default;
      return { jspdf, html2canvas: canvas.default };
    });
    return pdfPromise;
  },
};

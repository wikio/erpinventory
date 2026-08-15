export {};

declare global {
  interface Window {
    lucide: { createIcons: () => void };
    SariVendors: {
      loadCharts: () => Promise<unknown>;
      readSpreadsheet: (file: File) => Promise<unknown[][]>;
      loadPdf: () => Promise<unknown>;
    };
    SariModuleLoader: { has: (name: string) => boolean; load: (name: string) => Promise<unknown> };
    [key: string]: any;
  }
  const lucide: Window['lucide'];
}

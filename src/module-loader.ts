type LegacyModule = { render?: (containerId?: string) => Promise<void> | void };
type Loader = () => Promise<unknown>;

const importModule = async (loader: Loader, globalName: string): Promise<LegacyModule> => {
  await loader();
  const loaded = window[globalName] as LegacyModule | undefined;
  if (!loaded) throw new Error(`Le module ${globalName} n'a pas été initialisé.`);
  return loaded;
};

const sharedDetail = () => import('../js/modules/document-detail.js');
const complianceShared = () => import('../js/compliance-helpers.js');
const loaders: Record<string, () => Promise<LegacyModule>> = {
  dashboard: async () => {
    await window.SariVendors.loadCharts();
    await import('../js/charts.js');
    return importModule(() => import('../js/modules/dashboard.js'), 'DashboardModule');
  },
  inventory: () => importModule(() => import('../js/modules/inventory.js'), 'InventoryModule'),
  suppliers: async () => { await sharedDetail(); return importModule(() => import('../js/modules/suppliers.js'), 'SuppliersModule'); },
  importExport: () => importModule(() => import('../js/modules/import-export.js'), 'ImportExportModule'),
  tenders: () => importModule(() => import('../js/modules/tenders.js'), 'TendersModule'),
  sales: async () => { await sharedDetail(); return importModule(() => import('../js/modules/sales.js'), 'SalesModule'); },
  customers: async () => { await sharedDetail(); return importModule(() => import('../js/modules/customers.js'), 'CustomersModule'); },
  reports: () => importModule(() => import('../js/modules/reports.js'), 'ReportsModule'),
  translations: () => importModule(() => import('../js/modules/translations.js'), 'TranslationsModule'),
  auditLogs: () => importModule(() => import('../js/modules/audit.js'), 'AuditModule'),
  settings: async () => {
    await import('../js/modules/bank-account-detail.js');
    return importModule(() => import('../js/modules/settings.js'), 'SettingsModule');
  },
  hr: () => importModule(() => import('../js/modules/hr.js'), 'HRModule'),
  payslips: async () => { await complianceShared(); return importModule(() => import('../js/modules/payslips.js'), 'PayslipsModule'); },
  tasks: () => importModule(() => import('../js/modules/tasks.js'), 'TasksModule'),
  portal: () => importModule(() => import('../js/modules/portal.js'), 'EmployeePortalModule'),
  purchases: async () => { await sharedDetail(); return importModule(() => import('../js/modules/purchases.js'), 'PurchasesModule'); },
  ged: () => importModule(() => import('../js/modules/ged.js'), 'GEDModule'),
  taxes: () => importModule(() => import('../js/modules/taxes.js'), 'TaxesModule'),
  masterData: () => importModule(() => import('../js/modules/master-data.js'), 'MasterDataModule'),
  inventoryOps: () => importModule(() => import('../js/modules/inventory-ops.js'), 'InventoryOpsModule'),
  bulkImport: () => importModule(() => import('../js/modules/bulk-import.js'), 'BulkImportModule'),
  api: () => importModule(() => import('../js/modules/api.js'), 'ApiModule'),
  users: () => importModule(() => import('../js/modules/users.js'), 'UsersModule'),
  smtp: () => importModule(() => import('../js/modules/smtp.js'), 'SMTPModule'),
  cnas: async () => { await complianceShared(); return importModule(() => import('../js/modules/cnas.js'), 'CNASModule'); },
  casnos: async () => { await complianceShared(); return importModule(() => import('../js/modules/casnos.js'), 'CASNOSModule'); },
  commerceDirection: async () => { await complianceShared(); return importModule(() => import('../js/modules/commerce-direction.js'), 'CommerceDirectionModule'); },
  companyMinutes: async () => { await complianceShared(); return importModule(() => import('../js/modules/company-minutes.js'), 'CompanyMinutesModule'); },
  documentDetail: () => importModule(sharedDetail, 'DocumentDetailModule'),
  bankAccountDetail: () => importModule(() => import('../js/modules/bank-account-detail.js'), 'BankAccountDetailModule'),
};

const pending = new Map<string, Promise<LegacyModule>>();
window.SariModuleLoader = {
  has: (name: string) => name in loaders,
  load(name: string) {
    const loader = loaders[name];
    if (!loader) return Promise.reject(new Error(`Module ERP inconnu : ${name}`));
    if (!pending.has(name)) pending.set(name, loader().catch((error) => { pending.delete(name); throw error; }));
    return pending.get(name)!;
  },
};

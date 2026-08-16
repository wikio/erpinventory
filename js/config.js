/**
 * SARI Système - Configuration & Complete Trilingual Dictionary (FR / AR / EN)
 * Medical Equipment & Consumables Distribution Management System - Algeria
 */

const SARI_CONFIG = {
  COMPANY_NAME: "SARI SYSTÈMEs",
  COMPANY_FULL_NAME: "SARI Système - Médical & Distribution Algérie",
  COMPANY_ADDRESS: "Lotissement Medical, Bab Ezzouar, 16024 Alger, Algérie",
  COMPANY_PHONE: "+213 21 24 88 90 / +213 550 99 12 34",
  COMPANY_EMAIL: "contact@sarisysteme.dz",
  COMPANY_NIF: "001616098765432",
  COMPANY_RC: "16/00-0987654B19",
  COMPANY_AI: "1602409876",
  DEFAULT_TAX_RATE: 0.19, // 19% Algerian TVA
  
  BRAND_COLORS: {
    primary: '#009CC5',
    primaryDark: '#007D9E',
    lime: '#C6DA34',
    limeDark: '#9BB024',
    amber: '#EBB51A',
    amberDark: '#C69512',
    white: '#FFFFFF',
    darkBg: '#090E17',
    darkCard: '#131E2F',
    textDark: '#0F172A',
    textLight: '#F8FAFC'
  },

  CURRENCIES: {
    DZD: { code: 'DZD', symbol: 'DA', rate: 1, name: { fr: 'Dinar Algérien', ar: 'دينار جزائري', en: 'Algerian Dinar' } },
    EUR: { code: 'EUR', symbol: '€', rate: 145.50, name: { fr: 'Euro', ar: 'يورو', en: 'Euro' } },
    USD: { code: 'USD', symbol: '$', rate: 134.20, name: { fr: 'Dollar Américain', ar: 'دولار أمريكي', en: 'US Dollar' } },
    CNY: { code: 'CNY', symbol: '¥', rate: 18.60, name: { fr: 'Yuan Chinois', ar: 'يوان صيني', en: 'Chinese Yuan' } }
  },

  INCOTERMS: [
    { code: 'FOB', name: 'Free On Board (FOB)' },
    { code: 'CIF', name: 'Cost, Insurance and Freight (CIF)' },
    { code: 'EXW', name: 'Ex Works (EXW)' },
    { code: 'CFR', name: 'Cost and Freight (CFR)' },
    { code: 'DDP', name: 'Delivered Duty Paid (DDP)' },
    { code: 'FCA', name: 'Free Carrier (FCA)' }
  ],

  PRODUCT_CATEGORIES: [
    { id: 'diagnostic', fr: 'Équipement de Diagnostic', ar: 'معدات التشخيص', en: 'Diagnostic Equipment' },
    { id: 'consumables', fr: 'Consommables Médicaux', ar: 'المستلزمات الطبية المستهلكة', en: 'Medical Consumables' },
    { id: 'furniture', fr: 'Mobilier Hospitalier & Clinique', ar: 'أثاث المستشفيات والعيادات', en: 'Hospital & Clinic Furniture' },
    { id: 'sterilization', fr: 'Stérilisation & Laboratoire', ar: 'معدات التعقيم والمختبر', en: 'Sterilization & Laboratory' },
    { id: 'ppe', fr: 'Équipements de Protection (EPI)', ar: 'معدات الحماية الشخصية', en: 'Personal Protective Equipment (PPE)' },
    { id: 'surgical', fr: 'Accessoires Chirurgie & Pharm.', ar: 'الملحقات الجراحية والصيدلانية', en: 'Pharmaceutical & Surgical Accessories' }
  ],

  UNITS: [
    { id: 'piece', fr: 'Pièce (Pcs)', ar: 'قطعة (Pcs)', en: 'Piece (Pcs)' },
    { id: 'box', fr: 'Boîte (Bte)', ar: 'علبة (Bte)', en: 'Box (Bte)' },
    { id: 'carton', fr: 'Carton (Ctn)', ar: 'كرتون (Ctn)', en: 'Carton (Ctn)' },
    { id: 'pack', fr: 'Pack / Paquet', ar: 'حزمة (Pack)', en: 'Pack (Pck)' },
    { id: 'liter', fr: 'Litre (L)', ar: 'لتر (L)', en: 'Liter (L)' },
    { id: 'set', fr: 'Kit / Ensemble', ar: 'مجموعة / طقم', en: 'Set / Kit' }
  ],

  ALGERIAN_WILAYAS: [
    { code: '01', fr: '01 - Adrar', ar: '01 - أدرار', en: '01 - Adrar' },
    { code: '02', fr: '02 - Chlef', ar: '02 - الشلف', en: '02 - Chlef' },
    { code: '03', fr: '03 - Laghouat', ar: '03 - الأغواط', en: '03 - Laghouat' },
    { code: '04', fr: '04 - Oum El Bouaghi', ar: '04 - أم البواقي', en: '04 - Oum El Bouaghi' },
    { code: '05', fr: '05 - Batna', ar: '05 - باتنة', en: '05 - Batna' },
    { code: '06', fr: '06 - Béjaïa', ar: '06 - بجاية', en: '06 - Béjaïa' },
    { code: '07', fr: '07 - Biskra', ar: '07 - بسكرة', en: '07 - Biskra' },
    { code: '08', fr: '08 - Béchar', ar: '08 - بشار', en: '08 - Béchar' },
    { code: '09', fr: '09 - Blida', ar: '09 - البليدة', en: '09 - Blida' },
    { code: '10', fr: '10 - Bouira', ar: '10 - البويرة', en: '10 - Bouira' },
    { code: '13', fr: '13 - Tlemcen', ar: '13 - تلمسان', en: '13 - Tlemcen' },
    { code: '15', fr: '15 - Tizi Ouzou', ar: '15 - تيزي وزو', en: '15 - Tizi Ouzou' },
    { code: '16', fr: '16 - Alger (Algiers)', ar: '16 - الجزائر العاصمة', en: '16 - Algiers' },
    { code: '19', fr: '19 - Sétif', ar: '19 - سطيف', en: '19 - Sétif' },
    { code: '21', fr: '21 - Skikda', ar: '21 - سكيكدة', en: '21 - Skikda' },
    { code: '23', fr: '23 - Annaba', ar: '23 - عنابة', en: '23 - Annaba' },
    { code: '25', fr: '25 - Constantine', ar: '25 - قسنطينة', en: '25 - Constantine' },
    { code: '30', fr: '30 - Ouargla', ar: '30 - ورقلة', en: '30 - Ouargla' },
    { code: '31', fr: '31 - Oran', ar: '31 - وهران', en: '31 - Oran' },
    { code: '47', fr: '47 - Ghardaïa', ar: '47 - غرداية', en: '47 - Ghardaïa' }
  ],

  USER_ROLES: {
    admin: {
      id: 'admin',
      fr: 'Administrateur (Accès Total)',
      ar: 'المشرف العام (صلاحيات كاملة)',
      en: 'Administrator (Full Access)',
      badgeColor: '#009CC5'
    },
    inventory: {
      id: 'inventory',
      fr: 'Gestionnaire des Stocks',
      ar: 'مدير المخزون',
      en: 'Inventory Manager',
      badgeColor: '#C6DA34'
    },
    import_export: {
      id: 'import_export',
      fr: 'Responsable Import / Export',
      ar: 'مسؤول الاستيراد والتصدير',
      en: 'Import / Export Manager',
      badgeColor: '#EBB51A'
    },
    tenders: {
      id: 'tenders',
      fr: 'Responsable Appels d\'Offres',
      ar: 'مسؤول المناقصات والعقود',
      en: 'Tenders & Business Dev Manager',
      badgeColor: '#009CC5'
    },
    sales: {
      id: 'sales',
      fr: 'Employé Commercial (POS & B2B)',
      ar: 'موظف المبيعات (نقطة البيع والطلبيات)',
      en: 'Sales Employee (POS & B2B)',
      badgeColor: '#C6DA34'
    },
    readonly: {
      id: 'readonly',
      fr: 'Observateur (Lecture Seule)',
      ar: 'مراقب (قراءة فقط)',
      en: 'Read-Only Viewer',
      badgeColor: '#94A3B8'
    }
  }
};

// Comprehensive Trilingual Translation Dictionary (FR / AR / EN)
const TRANSLATIONS = {
  fr: {
    appName: "SARI SYSTÈME",
    appSubtitle: "Distribution Matériel Médical & Consommables • Algérie",
    dashboard: "Tableau de Bord",
    inventory: "Stock & Consommables",
    stockSubtitle: "Gestion des dispositifs médicaux, consommables, traçabilité des lots et conformité CE / MSPRH Algérie.",
    stockSearchLabel: "Recherche (SKU, nom, lot)", searchProducts: "Rechercher produits, références, lots ou fabricants…",
    allCategories: "Toutes les catégories", allWarehouses: "Tous les dépôts", expiryStatus: "Statut de péremption", allProducts: "Tous les produits",
    expiryAll: "Toutes les péremptions", expiryExpired: "Produits périmés", expiryNear: "Expiration proche (30 jours)", expiryValid: "Produits valides",
    skuReference: "SKU / Référence", productCompliance: "Produit & conformité", categoryHeader: "Catégorie", stockHeader: "Stock actuel", warehouseHeader: "Dépôt", purchasePriceHeader: "Prix d’achat", sellingPriceHeader: "Prix de vente", lotExpiryHeader: "Lot & péremption", actionsHeader: "Actions",
    menuOperations: "Opérations", menuCommerce: "Commerce", menuPeople: "Équipe", menuAnalytics: "Analyse & Documents", menuAdministration: "Administration", collapseMenu: "Réduire le menu",
    companyNifLabel: "NIF", companyAddressLabel: "Adresse", footerActivity: "Distribution de matériel médical et consommables en Algérie", footerTax: "TVA 19%", footerIncoterms: "Incoterms FOB/CIF", footerThemes: "4 thèmes natifs", footerSettingsLink: "Paramètres & connecteur DB →",
    suppliers: "Fournisseurs",
    importExport: "Import / Export",
    tenders: "Appels d'Offres",
    sales: "Ventes & POS (BL)",
    customers: "Clients & Institutions",
    reports: "Rapports & Stats",
    auditLogs: "Journal d'Audit",
    settings: "Paramètres & Doc",
    hr: "Ressources Humaines",
    tasks: "Tâches & Kanban",
    documents: "Gestion documentaire", gedDescription: "Archives téléversées et documents ERP classés par catégorie et tags.", gedTypesMenu: "Types", gedCategoriesMenu: "Catégories", gedModulesMenu: "Modules", gedTagsMenu: "Tags", gedAllTypes: "Tous les types GED", gedAllCategories: "Toutes les catégories", gedAllModules: "Tous les modules", gedAllTags: "Tous les tags", gedTypeLabel: "Type GED", gedTitleLabel: "Titre / nom du fichier", gedOtherType: "Autre document", inlineTranslationOn: "Mode traduction en ligne activé", inlineTranslationOff: "Mode traduction en ligne désactivé",
    checklist: "Checklist interactive",
    employeePortal: "Espace Collaborateur",
    purchases: "Achats & Réceptions",
    ged: "GED Centrale",
    taxes: "Fiscalité Algérienne",
    masterData: "Listes configurables",
    inventoryOps: "Lots & Inventaires",
    bulkImport: "Import de masse",
    api: "API & Intégrations",
    internalMessages: "Messagerie interne",
    vatRates: "Taux de TVA",
    documentNumbering: "Types & Numérotation",
    branding: "Gestion des logos",
    richDescription: "Description détaillée",
    helpDoc: "Architecture & Documentation",

    // Header & Navigation
    searchPlaceholder: "Rechercher produits, appels d'offres, expéditions... (Ctrl+K)",
    online: "En Ligne",
    offline: "Hors Ligne",
    syncPending: "Sync en Attente",
    syncNow: "Synchroniser",
    role: "Rôle",
    language: "Langue",
    theme: "Thème",
    lightMode: "Mode Clair",
    darkMode: "Mode Sombre",

    // Dashboard KPIs & Descriptions
    welcomeMessage: "Bienvenue sur le système ERP SARI Système. Surveillance du stock médical, des expéditions maritimes et des appels d'offres en Algérie.",
    totalProducts: "Total Produits",
    totalStockValue: "Valeur Totale Stock (DZD)",
    lowStockAlerts: "Alertes Stock Faible",
    todaySales: "Ventes / Commandes du Jour",
    monthlySales: "Ventes Mensuelles",
    activeShipments: "Expéditions Import en Cours",
    expiringProducts: "Péremptions Prochaines (< 30j)",
    activeTenders: "Appels d'Offres Actifs",
    globalRevenue: "Chiffre d'Affaires Global",
    outstandingReceivables: "Créances Clients en Attente",
    cumulativeImportCosts: "Coûts Importations Cumulés",
    stockMovementsChart: "Mouvements Stock (Entrées / Sorties)",
    revenueEvolutionChart: "Évolution Chiffre d'Affaires (DZD)",
    categoryDistChart: "Répartition par Catégorie Médicale",
    sourcingRatioChart: "Sourcing Import vs. Local Algérie",
    tenderPipelineChart: "Pipeline Appels d'Offres",
    activeTendersList: "Appels d'Offres en Cours & Échéances",
    recentAuditTimeline: "Journal des Activités Récentes",
    viewAll: "Voir tout",
    view: "Consulter",

    // Actions & Buttons
    addProduct: "+ Nouveau Produit",
    addSupplier: "+ Nouveau Fournisseur",
    addShipment: "+ Nouvelle Expédition",
    addTender: "+ Nouvel Appel d'Offres",
    newOrder: "+ Nouvelle Vente / Commande",
    addCustomer: "+ Nouveau Client",
    exportCSV: "Exporter CSV",
    exportExcel: "Exporter Excel",
    exportPDF: "Imprimer / PDF",
    importCSV: "Importer CSV/Excel",
    printBarcodes: "Imprimer Étiquettes Code-barres / QR",
    traceability: "Traçabilité Lot / Batch",
    sourcingCalc: "Comparateur Sourcing Local vs Import",
    landedCostCalc: "Calculateur Coût de Revient",
    bidCalculator: "Espace Préparation Offre (Devis)",
    scanBarcode: "Scanner Code-barres",
    save: "Enregistrer",
    cancel: "Annuler",
    close: "Fermer",
    edit: "Modifier",
    delete: "Supprimer",
    duplicate: "Dupliquer",
    printInvoice: "Facture",
    printBL: "Bon de Livraison (BL)",

    // Common Headers
    sku: "SKU / Réf",
    productName: "Produit & Conformité",
    category: "Catégorie",
    stock: "Stock Actuel",
    minStock: "Seuil Min",
    unitPrice: "Prix d'Achat (DA)",
    sellingPrice: "Prix Vente (DA)",
    warehouse: "Entrepôt / Dépôt",
    lotNumber: "N° Lot & Péremption",
    expirationDate: "Date de Péremption",
    status: "Statut",
    actions: "Actions",

    // Statuses
    inStock: "En Stock",
    lowStock: "Stock Faible",
    outOfStock: "Rupture de Stock",
    expired: "Périmé",
    nearExpiry: "Péremption Proche",
    watching: "Sous Surveillance",
    inPreparation: "En Préparation",
    submitted: "Soumission Déposée",
    underEvaluation: "En Évaluation",
    won: "Attribué (Gagné)",
    lost: "Non Retenu (Perdu)",
    cancelled: "Annulé",
    orderPlaced: "Commande Passée",
    inTransit: "En Transit / Expédié",
    customsClearance: "Dédouanement en Cours",
    received: "Réceptionné au Dépôt",
    quoted: "Devis Émis",
    confirmed: "Confirmé",
    delivered: "Livré (BL Émis)",
    invoiced: "Facturé",
    paid: "Payé",

    // Messages
    noDataFound: "Aucun enregistrement ne correspond à vos critères de recherche.",
    savedSuccessfully: "Enregistrement sauvegardé avec succès dans IndexedDB !",
    deletedSuccessfully: "Enregistrement supprimé avec succès.",
    syncSuccessMessage: "File d'attente hors-ligne synchronisée avec succès !",
    demoDataReset: "Réinitialiser & Charger Données Démo Algérie",
    demoDataSuccess: "Données de démonstration algériennes chargées avec succès !",
    readOnlyWarning: "Vous êtes en mode Observateur (Lecture Seule). L'édition est désactivée."
  },

  ar: {
    appName: "ساري سيستام (SARI SYSTÈMEs)",
    appSubtitle: "توزيع التجهيزات والمستلزمات الطبية • الجزائر",
    dashboard: "لوحة القيادة",
    inventory: "المخزون والمنتجات",
    stockSubtitle: "إدارة الأجهزة والمستهلكات الطبية وتتبع الحصص والمطابقة CE / MSPRH الجزائر.",
    stockSearchLabel: "البحث (SKU، الاسم، الحصة)", searchProducts: "البحث عن المنتجات أو المراجع أو الحصص أو المصنعين…",
    allCategories: "كل الفئات", allWarehouses: "كل المخازن", expiryStatus: "حالة الصلاحية", allProducts: "كل المنتجات",
    expiryAll: "كل تواريخ الصلاحية", expiryExpired: "منتجات منتهية", expiryNear: "انتهاء قريب (30 يوماً)", expiryValid: "منتجات صالحة",
    skuReference: "SKU / المرجع", productCompliance: "المنتج والمطابقة", categoryHeader: "الفئة", stockHeader: "المخزون الحالي", warehouseHeader: "المخزن", purchasePriceHeader: "سعر الشراء", sellingPriceHeader: "سعر البيع", lotExpiryHeader: "الحصة والصلاحية", actionsHeader: "الإجراءات",
    menuOperations: "العمليات", menuCommerce: "التجارة", menuPeople: "الفريق", menuAnalytics: "التحليل والوثائق", menuAdministration: "الإدارة", collapseMenu: "طي القائمة",
    companyNifLabel: "الرقم الجبائي", companyAddressLabel: "العنوان", footerActivity: "توزيع المعدات والمستهلكات الطبية في الجزائر", footerTax: "ضريبة القيمة المضافة 19%", footerIncoterms: "شروط FOB/CIF", footerThemes: "4 سمات أصلية", footerSettingsLink: "الإعدادات وموصل قاعدة البيانات ←",
    suppliers: "الموردون",
    importExport: "الاستيراد والتصدير",
    tenders: "المناقصات والاستشارات",
    sales: "المبيعات ونقطة البيع",
    customers: "العملاء والمستشفيات",
    reports: "التقارير والإحصائيات",
    auditLogs: "سجل الأنشطة والتدقيق",
    settings: "الإعدادات والوثائق",
    hr: "الموارد البشرية",
    tasks: "المهام ولوحة كانبان",
    documents: "إدارة الوثائق", gedDescription: "الأرشيفات المحمّلة ووثائق النظام مصنفة حسب الفئة والوسوم.", gedTypesMenu: "الأنواع", gedCategoriesMenu: "الفئات", gedModulesMenu: "الوحدات", gedTagsMenu: "الوسوم", gedAllTypes: "كل أنواع الوثائق", gedAllCategories: "كل الفئات", gedAllModules: "كل الوحدات", gedAllTags: "كل الوسوم", gedTypeLabel: "نوع الوثيقة", gedTitleLabel: "العنوان / اسم الملف", gedOtherType: "وثيقة أخرى", inlineTranslationOn: "تم تفعيل وضع الترجمة المباشرة", inlineTranslationOff: "تم تعطيل وضع الترجمة المباشرة",
    checklist: "قائمة تحقق تفاعلية",
    employeePortal: "فضاء الموظف",
    purchases: "المشتريات والاستلام",
    ged: "إدارة الوثائق المركزية",
    taxes: "الجباية الجزائرية",
    masterData: "القوائم القابلة للتخصيص",
    inventoryOps: "الحصص والجرد",
    bulkImport: "الاستيراد الجماعي",
    api: "واجهة API والتكامل",
    internalMessages: "الرسائل الداخلية",
    vatRates: "نسب الضريبة على القيمة المضافة",
    documentNumbering: "أنواع وترقيم الوثائق",
    branding: "إدارة الشعارات",
    richDescription: "الوصف المفصل",
    helpDoc: "البنية والوثائق الإرشادية",

    // Header & Navigation
    searchPlaceholder: "ابحث عن المنتجات، المناقصات، الشحنات، العملاء... (Ctrl+K)",
    online: "متصل بالإنترنت",
    offline: "وضع غير متصل",
    syncPending: "مزامنة معلقة",
    syncNow: "مزامنة الآن",
    role: "الصلاحية",
    language: "اللغة",
    theme: "المظهر",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",

    // Dashboard KPIs & Descriptions
    welcomeMessage: "مرحباً بك في نظام إدارة التوزيع ساري سيستام. متابعة المخزون الطبي والشحنات البحرية والمناقصات في جميع ولايات الجزائر.",
    totalProducts: "إجمالي المنتجات",
    totalStockValue: "القيمة الإجمالية للمخزون (د.ج)",
    lowStockAlerts: "تنبيهات نقص المخزون",
    todaySales: "مبيعات وطلبيات اليوم",
    monthlySales: "المبيعات الشهرية",
    activeShipments: "شحنات الاستيراد النشطة",
    expiringProducts: "منتجات قريبة الانتهاء (> 30 يوماً)",
    activeTenders: "المناقصات الجارية",
    globalRevenue: "إجمالي رقم الأعمال",
    outstandingReceivables: "ديون ومستحقات العملاء",
    cumulativeImportCosts: "التكلفة التراكمية للاستيراد",
    stockMovementsChart: "حركة المخزون (دخول / خروج)",
    revenueEvolutionChart: "تطور رقم الأعمال (د.ج)",
    categoryDistChart: "توزيع المخزون حسب الفئة الطبية",
    sourcingRatioChart: "مقارنة التوريد المحلي والاستيراد",
    tenderPipelineChart: "حالة عروض المناقصات",
    activeTendersList: "المناقصات الجارية ومواعيد الإيداع",
    recentAuditTimeline: "سجل الأنشطة والعمليات الأخيرة",
    viewAll: "عرض الكل",
    view: "عرض",

    // Actions & Buttons
    addProduct: "+ منتج جديد",
    addSupplier: "+ مورد جديد",
    addShipment: "+ شحنة جديدة",
    addTender: "+ مناقصة جديدة",
    newOrder: "+ طلبية أو بيع جديد",
    addCustomer: "+ عميل جديد",
    exportCSV: "تصدير CSV",
    exportExcel: "تصدير Excel",
    exportPDF: "طباعة / PDF",
    importCSV: "استيراد CSV/Excel",
    printBarcodes: "طباعة ملصقات الباركود و QR",
    traceability: "تتبع الحصص والتشغيلات (Lot)",
    sourcingCalc: "مقارنة الشراء المحلي والاستيراد",
    landedCostCalc: "حاسبة التكلفة الإجمالية الواصلة",
    bidCalculator: "فضاء تحضير عروض المناقصات (BPU)",
    scanBarcode: "ماسح الباركود",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    close: "إغلاق",
    edit: "تعديل",
    delete: "حذف",
    duplicate: "نسخ",
    printInvoice: "فاتورة",
    printBL: "وصل تسليم (BL)",

    // Common Headers
    sku: "الرمز / SKU",
    productName: "المنتج والمطابقة",
    category: "الفئة",
    stock: "المخزون المتوفر",
    minStock: "الحد الأدنى",
    unitPrice: "سعر الشراء (د.ج)",
    sellingPrice: "سعر البيع (د.ج)",
    warehouse: "المستودع / المخزن",
    lotNumber: "رقم الحصة والصلاحية",
    expirationDate: "تاريخ انتهاء الصلاحية",
    status: "الحالة",
    actions: "الإجراءات",

    // Statuses
    inStock: "متوفر بالمخزون",
    lowStock: "مخزون منخفض",
    outOfStock: "نفاد المخزون",
    expired: "منتهي الصلاحية",
    nearExpiry: "قريب الانتهاء",
    watching: "قيد المتابعة",
    inPreparation: "قيد التحضير",
    submitted: "تم إيداع العرض",
    underEvaluation: "قيد التقييم",
    won: "فوز بالعقد",
    lost: "غير فائز",
    cancelled: "ملغاة / غير مجدية",
    orderPlaced: "تم تقديم الطلب",
    inTransit: "في الشحن / الترانزيت",
    customsClearance: "التخليص الجمركي",
    received: "تم الاستلام في المخزن",
    quoted: "عرض سعر",
    confirmed: "مؤكد",
    delivered: "تم التسليم (BL)",
    invoiced: "تمت الفوترة",
    paid: "مدفوع",

    // Messages
    noDataFound: "لم يتم العثور على سجلات تطابق معايير البحث.",
    savedSuccessfully: "تم حفظ السجل بنجاح في قاعدة البيانات المحلية!",
    deletedSuccessfully: "تم الحذف بنجاح.",
    syncSuccessMessage: "تمت مزامنة البيانات المعلقة بنجاح!",
    demoDataReset: "إعادة تعيين وتحميل بيانات الجزائر النموذجية",
    demoDataSuccess: "تم تحميل البيانات التجريبية الجزائرية بنجاح!",
    readOnlyWarning: "أنت مسجل الدخول بصفة مراقب (قراءة فقط). التعديل مقيد."
  },

  en: {
    appName: "SARI SYSTÈMES",
    appSubtitle: "Medical Equipment & Consumables Distribution • Algeria",
    dashboard: "Dashboard",
    inventory: "Inventory & Consumables",
    stockSubtitle: "Manage medical devices, consumables, lot traceability and CE / MSPRH Algeria compliance.",
    stockSearchLabel: "Search (SKU, name, lot)", searchProducts: "Search products, references, lots or manufacturers…",
    allCategories: "All categories", allWarehouses: "All warehouses", expiryStatus: "Expiry status", allProducts: "All products",
    expiryAll: "All expiry statuses", expiryExpired: "Expired products", expiryNear: "Near expiry (30 days)", expiryValid: "Valid products",
    skuReference: "SKU / Reference", productCompliance: "Product & compliance", categoryHeader: "Category", stockHeader: "Current stock", warehouseHeader: "Warehouse", purchasePriceHeader: "Purchase price", sellingPriceHeader: "Selling price", lotExpiryHeader: "Lot & expiry", actionsHeader: "Actions",
    menuOperations: "Operations", menuCommerce: "Commerce", menuPeople: "Team", menuAnalytics: "Analytics & Documents", menuAdministration: "Administration", collapseMenu: "Collapse menu",
    companyNifLabel: "Tax ID (NIF)", companyAddressLabel: "Address", footerActivity: "Medical equipment and consumables distribution in Algeria", footerTax: "VAT 19%", footerIncoterms: "FOB/CIF Incoterms", footerThemes: "4 native themes", footerSettingsLink: "Settings & DB connector →",
    suppliers: "Suppliers",
    importExport: "Import / Export",
    tenders: "Tenders & Consultations",
    sales: "Sales & POS (BL)",
    customers: "Customers & Institutions",
    reports: "Reports & Analytics",
    auditLogs: "Audit Logs",
    settings: "Settings & Docs",
    hr: "Human Resources",
    tasks: "Tasks & Kanban",
    documents: "Document Management", gedDescription: "Uploaded archives and ERP documents classified by category and tags.", gedTypesMenu: "Types", gedCategoriesMenu: "Categories", gedModulesMenu: "Modules", gedTagsMenu: "Tags", gedAllTypes: "All GED types", gedAllCategories: "All categories", gedAllModules: "All modules", gedAllTags: "All tags", gedTypeLabel: "GED type", gedTitleLabel: "Title / file name", gedOtherType: "Other document", inlineTranslationOn: "Inline translation mode enabled", inlineTranslationOff: "Inline translation mode disabled",
    checklist: "Interactive Checklist",
    employeePortal: "Employee Portal",
    purchases: "Purchases & Receipts",
    ged: "Central Document Management",
    taxes: "Algerian Tax Management",
    masterData: "Configurable Lists",
    inventoryOps: "Lots & Inventory",
    bulkImport: "Bulk Import",
    api: "API & Integrations",
    internalMessages: "Internal Messaging",
    vatRates: "VAT Rates",
    documentNumbering: "Document Types & Numbering",
    branding: "Logo Management",
    richDescription: "Detailed Description",
    helpDoc: "Architecture & Documentation",

    // Header & Navigation
    searchPlaceholder: "Search products, tenders, shipments, clients... (Ctrl+K)",
    online: "Online",
    offline: "Offline",
    syncPending: "Sync Pending",
    syncNow: "Sync Now",
    role: "Role",
    language: "Language",
    theme: "Theme",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",

    // Dashboard KPIs & Descriptions
    welcomeMessage: "Welcome to SARI Système ERP. Oversee medical inventory, maritime imports, and hospital tenders across Algeria.",
    totalProducts: "Total Products",
    totalStockValue: "Total Stock Value (DZD)",
    lowStockAlerts: "Low Stock Alerts",
    todaySales: "Today's Sales / Orders",
    monthlySales: "Monthly Sales",
    activeShipments: "Active Import Shipments",
    expiringProducts: "Upcoming Expirations (< 30d)",
    activeTenders: "Active Tenders & Deadlines",
    globalRevenue: "Total Revenue (DZD)",
    outstandingReceivables: "Outstanding Receivables",
    cumulativeImportCosts: "Cumulative Import Costs",
    stockMovementsChart: "Stock Movements (In / Out)",
    revenueEvolutionChart: "Monthly Revenue Evolution (DZD)",
    categoryDistChart: "Medical Category Distribution",
    sourcingRatioChart: "Import vs. Local Sourcing Ratio",
    tenderPipelineChart: "Tenders Pipeline Status",
    activeTendersList: "Active Tenders & Submission Deadlines",
    recentAuditTimeline: "Recent Activity Audit Timeline",
    viewAll: "View All",
    view: "View",

    // Actions & Buttons
    addProduct: "+ New Product",
    addSupplier: "+ New Supplier",
    addShipment: "+ New Shipment",
    addTender: "+ New Tender",
    newOrder: "+ New Sale / Order",
    addCustomer: "+ New Customer",
    exportCSV: "Export CSV",
    exportExcel: "Export Excel",
    exportPDF: "Print / PDF",
    importCSV: "Import CSV/Excel",
    printBarcodes: "Print Barcodes / QR Labels",
    traceability: "Lot / Batch Traceability",
    sourcingCalc: "Local vs. Import Sourcing Compare",
    landedCostCalc: "Landed Cost Calculator",
    bidCalculator: "Bid Preparation Workspace (BPU)",
    scanBarcode: "Scan Barcode",
    save: "Save Changes",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    duplicate: "Duplicate",
    printInvoice: "Invoice",
    printBL: "Delivery Note (BL)",

    // Common Headers
    sku: "SKU / Code",
    productName: "Product & Compliance",
    category: "Category",
    stock: "Current Stock",
    minStock: "Min Alert",
    unitPrice: "Purchase Price (DA)",
    sellingPrice: "Selling Price (DA)",
    warehouse: "Warehouse / Depot",
    lotNumber: "Lot # & Expiry",
    expirationDate: "Expiration Date",
    status: "Status",
    actions: "Actions",

    // Statuses
    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    expired: "Expired",
    nearExpiry: "Near Expiration",
    watching: "Watching",
    inPreparation: "In Preparation",
    submitted: "Submitted",
    underEvaluation: "Under Evaluation",
    won: "Won / Awarded",
    lost: "Lost / Not Awarded",
    cancelled: "Cancelled",
    orderPlaced: "Order Placed",
    inTransit: "In Transit / Shipped",
    customsClearance: "Customs Clearance",
    received: "Received in Warehouse",
    quoted: "Quoted",
    confirmed: "Confirmed",
    delivered: "Delivered (BL Issued)",
    invoiced: "Invoiced",
    paid: "Paid",

    // Messages
    noDataFound: "No records found matching your filter criteria.",
    savedSuccessfully: "Record saved successfully to local IndexedDB!",
    deletedSuccessfully: "Record deleted successfully.",
    syncSuccessMessage: "Offline sync queue processed successfully!",
    demoDataReset: "Reset & Load Algerian Demo Dataset",
    demoDataSuccess: "Algerian demo dataset loaded successfully!",
    readOnlyWarning: "You are logged in as a Read-Only Viewer. Editing actions are disabled."
  }
};

Object.assign(TRANSLATIONS.fr,{importDescription:"Suivi des expéditions maritimes/aériennes, dédouanement, coûts rendus et Incoterms.",tendersDescription:"Suivi des consultations, cahiers des charges et préparation des offres techniques et financières.",salesDescription:"Catalogue, panier, commandes B2B, factures et bons de livraison.",inventoryOpsDescription:"Stock par dépôt, lots, FEFO/FIFO, mouvements, ajustements et comptages physiques."});
Object.assign(TRANSLATIONS.ar,{importDescription:"متابعة الشحنات البحرية والجوية والتخليص والتكاليف النهائية وشروط التجارة.",tendersDescription:"متابعة الاستشارات ودفاتر الشروط وتحضير العروض التقنية والمالية.",salesDescription:"الكتالوج والسلة وطلبيات المؤسسات والفواتير ووصولات التسليم.",inventoryOpsDescription:"المخزون حسب المستودع والحصص وحركات FEFO/FIFO والتسويات والجرد."});
Object.assign(TRANSLATIONS.en,{importDescription:"Track sea/air shipments, customs clearance, landed costs and Incoterms.",tendersDescription:"Track consultations, specifications and technical/financial bid preparation.",salesDescription:"Catalog, cart, B2B orders, invoices and delivery notes.",inventoryOpsDescription:"Stock by warehouse, lots, FEFO/FIFO, movements, adjustments and physical counts."});
Object.assign(TRANSLATIONS.fr,{viewOrder:"Consulter la commande",files:"pièce(s)",participants:"participant(s)",daysRecorded:"jour(s) enregistré(s)",valuesConfigured:"valeur(s) configurée(s)",expectedColumns:"Colonnes attendues :",rowsImported:"ligne(s) importée(s)",isRequired:"est obligatoire",invalidNumber:"nombre invalide",rowLabel:"Ligne",paymentTransactions:"Transactions de paiement",newOperation:"Nouvelle opération"});
Object.assign(TRANSLATIONS.ar,{viewOrder:"عرض الطلبية",files:"ملف (ملفات)",participants:"مشارك (مشاركون)",daysRecorded:"يوم (أيام) مسجلة",valuesConfigured:"قيمة (قيم) مهيأة",expectedColumns:"الأعمدة المتوقعة:",rowsImported:"سطر (أسطر) مستوردة",isRequired:"إلزامي",invalidNumber:"رقم غير صالح",rowLabel:"سطر",paymentTransactions:"معاملات الدفع",newOperation:"عملية جديدة"});
Object.assign(TRANSLATIONS.en,{viewOrder:"View order",files:"file(s)",participants:"participant(s)",daysRecorded:"day(s) recorded",valuesConfigured:"configured value(s)",expectedColumns:"Expected columns:",rowsImported:"row(s) imported",isRequired:"is required",invalidNumber:"invalid number",rowLabel:"Row",paymentTransactions:"Payment Transactions",newOperation:"New Operation"});

// Reports page (section 203) + report customization (section 200) + misc UI
const reportKeysFr={reportsDescription:"Évaluations des stocks, analyses de chiffre d'affaires par wilaya, coûts importations et profitabilité.",customizeReport:"Personnaliser le rapport",customizeReportHelp:"En-tête et lignes du rapport, avec champs dynamiques {reference}, {label}, {status}, {amount}, {type}, {company}, {title}, {date}.",reportHeaderTemplate:"En-tête du rapport",reportRowTemplate:"Ligne du rapport",detailedReport:"Rapport détaillé",printPDF:"Imprimer / PDF",reportTab_inventory:"Stock & Péremptions",reportTab_sales:"Ventes & Créances",reportTab_costs:"Coûts",reportTab_imports:"Importations",reportTab_tenders:"Appels d'Offres",reportTab_finance:"Rentabilité & Finances",reportTab_partners:"Clients & Fournisseurs",costFreight:"Fret / transport",costInsurance:"Assurance",costCustoms:"Douanes",costTotal:"Total logistique",costShipment:"Expédition",costSupplier:"Fournisseur",costPurchases:"Total achats locaux"};
const reportKeysAr={reportsDescription:"تقييم المخزون وتحليلات رقم الأعمال حسب الولاية وتكاليف الاستيراد والربحية.",customizeReport:"تخصيص التقرير",customizeReportHelp:"رأس التقرير وسطوره مع حقول ديناميكية {reference}، {label}، {status}، {amount}، {type}، {company}، {title}، {date}.",reportHeaderTemplate:"رأس التقرير",reportRowTemplate:"سطر التقرير",detailedReport:"تقرير مفصل",printPDF:"طباعة / PDF",reportTab_inventory:"المخزون والصلاحيات",reportTab_sales:"المبيعات والذمم",reportTab_costs:"التكاليف",reportTab_imports:"الواردات",reportTab_tenders:"المناقصات",reportTab_finance:"الربحية والمالية",reportTab_partners:"العملاء والموردون",costFreight:"الشحن / النقل",costInsurance:"التأمين",costCustoms:"الجمارك",costTotal:"الإجمالي اللوجستي",costShipment:"الشحنة",costSupplier:"المورد",costPurchases:"إجمالي المشتريات المحلية"};
const reportKeysEn={reportsDescription:"Stock assessments, sales analysis by wilaya, import costs and profitability.",customizeReport:"Customize Report",customizeReportHelp:"Report header and rows with dynamic fields {reference}, {label}, {status}, {amount}, {type}, {company}, {title}, {date}.",reportHeaderTemplate:"Report Header",reportRowTemplate:"Report Row",detailedReport:"Detailed Report",printPDF:"Print / PDF",reportTab_inventory:"Stock & Expirations",reportTab_sales:"Sales & Receivables",reportTab_costs:"Costs",reportTab_imports:"Imports",reportTab_tenders:"Tenders",reportTab_finance:"Profitability & Finance",reportTab_partners:"Clients & Suppliers",costFreight:"Freight / Transport",costInsurance:"Insurance",costCustoms:"Customs",costTotal:"Total Logistics",costShipment:"Shipment",costSupplier:"Supplier",costPurchases:"Total local purchases"};
Object.assign(TRANSLATIONS.fr,reportKeysFr);Object.assign(TRANSLATIONS.ar,reportKeysAr);Object.assign(TRANSLATIONS.en,reportKeysEn);

// Sections 222–239: commerce, lifecycle, partner filters and lazy-loading UI.
Object.assign(TRANSLATIONS.fr,{documentTypeFilter:'Type de document',allDocumentTypes:'Tous les types de documents',paymentMethod:'Mode de règlement',salesStatistics:'Statistiques des ventes',recognizedRevenue:'Chiffre d’affaires reconnu',documentCount:'Nombre de documents',averageOrderValue:'Panier moyen',topProduct:'Produit vedette',monthlyTrend:'Tendance mensuelle',documentLifecycle:'Cycle de vie du document',lifecycleEvents:'événement(s)',lifecycleEvent:'Événement',viewLifecycle:'Voir le processus complet',purchaseWorkflow:'Workflow des achats',country:'Pays',allCountries:'Tous les pays',notes:'Notes',loadingModule:'Chargement du module',documentNotFound:'Document introuvable.',close:'Fermer'});
Object.assign(TRANSLATIONS.en,{documentTypeFilter:'Document type',allDocumentTypes:'All document types',paymentMethod:'Payment method',salesStatistics:'Sales statistics',recognizedRevenue:'Recognized revenue',documentCount:'Document count',averageOrderValue:'Average order value',topProduct:'Top product',monthlyTrend:'Monthly trend',documentLifecycle:'Document lifecycle',lifecycleEvents:'event(s)',lifecycleEvent:'Event',viewLifecycle:'View full process',purchaseWorkflow:'Purchase workflow',country:'Country',allCountries:'All countries',notes:'Notes',loadingModule:'Loading module',documentNotFound:'Document not found.',close:'Close'});
Object.assign(TRANSLATIONS.ar,{documentTypeFilter:'نوع الوثيقة',allDocumentTypes:'كل أنواع الوثائق',paymentMethod:'طريقة الدفع',salesStatistics:'إحصائيات المبيعات',recognizedRevenue:'رقم الأعمال المعترف به',documentCount:'عدد الوثائق',averageOrderValue:'متوسط قيمة الطلب',topProduct:'المنتج الأكثر مبيعاً',monthlyTrend:'الاتجاه الشهري',documentLifecycle:'دورة حياة الوثيقة',lifecycleEvents:'حدث',lifecycleEvent:'حدث',viewLifecycle:'عرض المسار الكامل',purchaseWorkflow:'مسار المشتريات',country:'البلد',allCountries:'كل البلدان',notes:'ملاحظات',loadingModule:'تحميل الوحدة',documentNotFound:'الوثيقة غير موجودة.',close:'إغلاق'});
Object.assign(TRANSLATIONS.fr,{startDate:'Date début',endDate:'Date fin',customer:'Client',allCustomers:'Tous les clients',purchaseStatistics:'Statistiques avancées des achats',purchaseSpendTrend:'Dépenses et performance fournisseurs',supplier:'Fournisseur',allSuppliers:'Tous les fournisseurs',status:'Statut',allStatuses:'Tous les statuts',totalSpend:'Dépenses totales',averagePurchase:'Achat moyen',topSupplier:'Fournisseur principal',topPurchasedProduct:'Produit le plus acheté',taxInspectionOffice:'Inspection fiscale',paymentProof:'Preuve de paiement',remainingBalance:'Solde restant'});
Object.assign(TRANSLATIONS.en,{startDate:'Start date',endDate:'End date',customer:'Customer',allCustomers:'All customers',purchaseStatistics:'Advanced purchase statistics',purchaseSpendTrend:'Spend and supplier performance',supplier:'Supplier',allSuppliers:'All suppliers',status:'Status',allStatuses:'All statuses',totalSpend:'Total spend',averagePurchase:'Average purchase',topSupplier:'Top supplier',topPurchasedProduct:'Top purchased product',taxInspectionOffice:'Tax inspection office',paymentProof:'Payment proof',remainingBalance:'Remaining balance'});
Object.assign(TRANSLATIONS.fr,{technicalIdImmutable:'ID technique (immuable)',technicalId:'ID technique',businessOrder:'Ordre / séquence métier',orderLabel:'Ordre',expected:'Attendu',counted:'Compté',variance:'Écart',searchSelectLot:'Rechercher ou sélectionner un numéro de lot',selectLotTraceability:'Sélectionnez un numéro de lot pour afficher sa traçabilité et sa conformité',selectAll:'Tout sélectionner',searchSelectProduct:'Rechercher ou sélectionner un produit'});
Object.assign(TRANSLATIONS.en,{technicalIdImmutable:'Technical ID (immutable)',technicalId:'Technical ID',businessOrder:'Order / Business Sequence',orderLabel:'Order',expected:'Expected',counted:'Counted',variance:'Variance',searchSelectLot:'Search or select a Lot Number',selectLotTraceability:'Select a lot number to display its traceability and compliance record',selectAll:'Select all',searchSelectProduct:'Search or select a product'});
Object.assign(TRANSLATIONS.ar,{technicalIdImmutable:'المعرّف التقني (غير قابل للتغيير)',technicalId:'المعرّف التقني',businessOrder:'الترتيب / التسلسل المهني',orderLabel:'الترتيب',expected:'المتوقع',counted:'المعدود',variance:'الفارق',searchSelectLot:'ابحث أو اختر رقم الحصة',selectLotTraceability:'اختر رقم حصة لعرض التتبع وسجل المطابقة',selectAll:'تحديد الكل',searchSelectProduct:'ابحث أو اختر منتجاً'});
Object.assign(TRANSLATIONS.ar,{startDate:'تاريخ البداية',endDate:'تاريخ النهاية',customer:'العميل',allCustomers:'كل العملاء',purchaseStatistics:'إحصائيات المشتريات المتقدمة',purchaseSpendTrend:'النفقات وأداء الموردين',supplier:'المورد',allSuppliers:'كل الموردين',status:'الحالة',allStatuses:'كل الحالات',totalSpend:'إجمالي النفقات',averagePurchase:'متوسط الشراء',topSupplier:'المورد الرئيسي',topPurchasedProduct:'المنتج الأكثر شراءً',taxInspectionOffice:'مفتشية الضرائب',paymentProof:'إثبات الدفع',remainingBalance:'الرصيد المتبقي'});

// Sections 265–288: consultation, administration, fiscal and settings translations.
Object.assign(TRANSLATIONS.fr,{"assignedToRecord":"Attribué à l’enregistrement","assignee":"Responsable","dueDate":"Échéance","linkedInvoicesOrdersTransactions":"Factures, commandes et transactions liées","searchLinkMultipleDocuments":"Rechercher et lier plusieurs documents","createTaskTitle":"Créer une tâche (Titre)","inspection":"Inspection","baseRevenue":"Base/CA","amountDue":"Montant dû","balance":"Solde","taxInspections":"Inspections fiscales","newG50":"Nouvelle déclaration G50","newIBS":"Nouvelle déclaration IBS","newBilan":"Nouvelle déclaration BILAN","collectedVat":"TVA collectée","deductibleVat":"TVA déductible","totalAmountDue":"Montant total dû","productsCoveredG50":"Produits concernés par la G50","noProductFilter":"Aucun filtre produit : toutes les factures de vente sont affichées.","associatedPurchaseInvoices":"Factures d’achat associées","associatedSalesInvoices":"Factures de vente associées","noInvoice":"Aucune facture","taxableProfit":"Bénéfice imposable","taxInspection":"Inspection fiscale","taxArticleNumber":"N° article fiscal (NAI)","filingDate":"Date de dépôt","nif":"NIF","equity":"CAPITAUX PROPRES","nonCurrentAssets":"ACTIF NON COURANT","liabilities":"PASSIF","assets":"ACTIF","totalLiabilities":"Total passif","totalAssets":"Total actif","fiscalAmountPayment":"Montant fiscal dû / paiement associé","detailedNotes":"Notes détaillées","userAccounts":"Comptes utilisateurs","userAccountsDescription":"Comptes, rôles, employés liés, activations et demandes de mot de passe.","accounts":"Comptes","passwordResetRequests":"Demandes de réinitialisation","smtpConfiguration":"Configuration SMTP","newAccount":"Nouveau compte","enableDemoAccounts":"Activer les comptes démo","showDemoAccounts":"Afficher les comptes démo sur la connexion","activationQrSize":"Taille QR activation","cardsView":"Cartes","listView":"Liste","searchUsers":"Rechercher par nom, identifiant, email ou description","allRoles":"Tous les rôles","allAccountStatuses":"Tous les états","activeAccounts":"Comptes actifs","inactiveAccounts":"Comptes inactifs","active":"Actif","inactive":"Inactif","role":"Rôle","linkedEmployee":"Employé lié","displayName":"Nom affiché","username":"Identifiant","email":"Email","accountDescription":"Description du compte","specificPermissions":"Permissions spécifiques","accordingToRole":"Selon le rôle","lastLogin":"Dernière connexion","password":"Mot de passe","activation":"Activation","createAccount":"Créer un compte","editAccount":"Modifier le compte","accountActive":"Compte actif","linkedActiveEmployee":"Employé actif lié","none":"Aucun","generateSecurePassword":"Générer un mot de passe sécurisé","yes":"Oui","no":"Non","request":"Demande","user":"Utilisateur","allRequestStatuses":"Tous les statuts de demande","searchResetRequests":"Rechercher une demande, un utilisateur ou un email","pending":"En attente","approved":"Approuvée","rejected":"Rejetée","approve":"Approuver","approveEmail":"Approuver & email","reject":"Rejeter","requestDetails":"Détail de la demande","processRequest":"Traiter la demande","requestedAt":"Demandée le","processedAt":"Traitée le","processedBy":"Traitée par","requestStatus":"Statut de la demande","noRequest":"Aucune demande.","smtpDescription":"Configuration sécurisée du serveur de messagerie pour les activations et réinitialisations. Le mot de passe reste uniquement en mémoire serveur.","smtpHost":"Hôte SMTP","port":"Port","security":"Sécurité","smtpUser":"Utilisateur SMTP","smtpPassword":"Mot de passe SMTP","state":"État","enabled":"Activé","disabled":"Désactivé","senderName":"Nom expéditeur","senderAddress":"Adresse expéditeur","verifyTlsCertificate":"Vérifier le certificat TLS","testSend":"Tester l’envoi","saveSmtp":"Enregistrer SMTP","translationManager":"Gestionnaire des Traductions & Langues","translationManagerDescription":"Édition en temps réel du dictionnaire trilingue, ajout de clés personnalisées et export des packs de langues.","coverageAudit":"Audit de couverture","configurableLists":"Listes configurables","newTranslationKey":"Nouvelle clé de traduction","exportJson":"Exporter JSON","customOverride":"Surcharge personnalisée :","keyIdentifier":"Clé Identifiant (Key)","auditDescription":"Journalisation inviolable des opérations utilisateurs, soumissions d’offres et mouvements de stock.","searchAction":"Rechercher une action","filterErpModule":"Filtrer par module ERP","allModules":"Tous les modules","editAuditEntry":"Modifier une entrée d’audit","auditEntryDetails":"Détail de l’entrée d’audit","modifiedFields":"Champs modifiés","before":"Avant","after":"Après","timestamp":"Horodatage","manageI18n":"Gérer i18n","architectureRoadmap":"Architecture & feuille de route","barcodeLabel":"Étiquette code-barres","logos":"Logos","paymentsBanking":"Paiements & banque","vatRatesMenu":"Taux de TVA","typesNumbering":"Types & numérotation","checklistTemplates":"Modèles de checklist","rolesPermissions":"Rôles & permissions","rolesPermissionsDescription":"Contrôle granulaire par module et action. Les modifications prennent effet à la prochaine navigation.","generalSettingsDescription":"Coordonnées fiscales de l’entreprise, 4 thèmes natifs, connecteurs de bases de données (MySQL/PostgreSQL/MongoDB) et outils d’export.","settingsSummary":"Config • DB • Thèmes • Sauvegardes","administratorFullAccess":"Administrateur (Accès total)","importExportManager":"Responsable Import/Export","stockManager":"Gestionnaire de stock","readOnlyViewer":"Observateur (lecture seule)","salesEmployee":"Employé commercial (POS & B2B)","tenderManager":"Responsable appels d’offres","companyDetails":"Coordonnées de l’Entreprise SARI SYSTÈMES","companyDetailsDescription":"Ces informations apparaissent officiellement sur l’en-tête des factures, bons de livraison (BL) et rapports d’appel d’offres.","saveInformation":"Enregistrer les informations","identityLocation":"Identité & localisation","legalCompanyName":"Raison sociale / nom de société *","subtitleActivity":"Sous-titre & activité","fullAddress":"Adresse complète (siège / dépôt principal)","phoneNumbers":"Numéro(s) de téléphone","officialEmail":"Email officiel","taxIdNumber":"NIF (Numéro d’identification fiscale)","tradeRegister":"RC (Registre de commerce)","statisticalId":"NIS (Numéro d’identification statistique)","taxArticleId":"AI (Numéro d’article fiscal)","bankDetails":"Coordonnées bancaires (RIB BNA/CPA/BEA)","fiscalBankIdentifiers":"Identifiants fiscaux & bancaires (Algérie)","algeriaVatRate":"Taux TVA Algérie (%)","mainCurrency":"Devise principale","noDefaultAccount":"Aucun compte par défaut","manageCurrencies":"Gérer les devises","nativeThemes":"Thèmes natifs (Style Apple / pleine largeur)","nativeThemesDescription":"Sélectionnez l’un des 4 thèmes natifs conçus pour s’adapter à la luminosité des entrepôts et aux besoins visuels de l’équipe médicale.","sariClinicalDescription":"Teal clinique sobre — tons bleu-vert froids et sobres, idéals pour les écrans denses (inventaire, BPU, rapports).","sariSunsetDescription":"Ambre et orange chaleureux — tons chauds dynamiques conçus pour les modules commerciaux (appels d’offres et ventes POS).","sariMidnightDescription":"Vrai mode sombre natif — contraste élevé optimisé pour le travail de nuit en entrepôt.","selectTheme":"Sélectionner →","databaseConnectorDescription":"Test réel côté serveur pour MySQL, PostgreSQL et MongoDB. Les secrets saisis restent uniquement en mémoire serveur, sauf SARI_DB_PASSWORD fourni par l’environnement.","databaseType":"Type de base de données","hostRequired":"Hôte *","portRequired":"Port * (nombres uniquement)","databaseNameRequired":"Nom de la base de données *","dbUsername":"Nom d’utilisateur","dbPassword":"Mot de passe","dbSecretHelper":"Jamais écrit dans .runtime. Une valeur saisie dans l’interface reste disponible dans la mémoire serveur jusqu’au redémarrage du serveur.","ssl":"SSL","dbDisabled":"Désactivé","dbEnabled":"Activé","activeBackend":"Backend actif","indexedDbOnly":"Non — IndexedDB uniquement","syncViaApi":"Oui — synchronisation via API","testForReal":"Tester réellement","testSave":"Tester & enregistrer","migrateIndexedDb":"Migration IndexedDB → {database}","migrationDescription":"Transfert idempotent par table/collection, vérification des écritures dans la cible et rapport détaillé.","preValidate":"Prévalider","startMigration":"Lancer la migration","diagnosticConsole":"Console diagnostique","diagnosticConsoleDescription":"Tentatives de connexion et étapes de migration en temps réel.","noEvent":"Aucun événement.","clear":"Effacer","connectionAttempt":"Tentative de connexion","connectionStep":"Étape de connexion","connectionSuccess":"Connexion réussie","connectionFailure":"Échec de connexion","configurationSaved":"Configuration enregistrée","migrationPreflight":"Prévalidation de migration","migrationBatchStart":"Démarrage du lot de migration","migrationRecordFailure":"Échec d’un enregistrement","migrationBatchComplete":"Lot de migration terminé","migrationSchemaCreated":"Schéma de migration créé","standardProductLabel":"Étiquette produit standard","barcodeDescription":"Utilisez les variables {code} (référence), {sku}, {barcode}, {hash} (clé hashée) et {id}. La clé hashée n’est ajoutée que si l’option « Clé hashée dans le QR » est cochée.","applicationLogo":"Logo de l’application","financialDocumentsLogo":"Logo des documents financiers","financialLogoDescription":"Logo indépendant pour les factures, devis, commandes et bons de livraison. Utilisé dans l’en-tête et l’espace collaborateur.","dragImageHere":"Glissez une image ici","verificationSecretKey":"Clé secrète de vérification","verificationUrl":"URL de vérification","addAccount":"+ Compte","addCoupon":"+ Coupon","addReferrer":"+ Référent","bilanLine_actif_non_courant":"ACTIF NON COURANT","bilanLine_ecart_acquisition_goodwill":"Écart d’acquisition / goodwill","bilanLine_immobilisations_incorporelles":"Immobilisations incorporelles","bilanLine_immobilisations_corporelles":"Immobilisations corporelles","bilanLine_terrains":"Terrains","bilanLine_constructions":"Constructions","bilanLine_concessions":"Concessions","bilanLine_installations_techniques":"Installations techniques, matériel et outillage","bilanLine_autres_immobilisations_corporelles":"Autres immobilisations corporelles","bilanLine_immobilisations_en_cours":"Immobilisations en cours","bilanLine_immobilisations_financieres":"Immobilisations financières","bilanLine_titres_participation":"Titres mis en équivalence / participations","bilanLine_autres_participations_creances":"Autres participations et créances rattachées","bilanLine_autres_titres_immobilises":"Autres titres immobilisés","bilanLine_prets_actifs_non_courants":"Prêts et autres actifs financiers non courants","bilanLine_impots_differes_actif":"Impôts différés actif","bilanLine_actif_courant":"ACTIF COURANT","bilanLine_stocks_encours":"Stocks et encours","bilanLine_creances_emplois_assimiles":"Créances et emplois assimilés","bilanLine_clients":"Clients","bilanLine_autres_debiteurs":"Autres débiteurs","bilanLine_impots_taxes_actif":"Impôts et taxes assimilés","bilanLine_autres_creances_actifs_courants":"Autres créances et actifs courants","bilanLine_disponibilites_assimiles":"Disponibilités et assimilés","bilanLine_placements_financiers":"Placements et autres actifs financiers courants","bilanLine_tresorerie_actif":"Trésorerie actif","bilanLine_capitaux_propres":"CAPITAUX PROPRES","bilanLine_capital_emis":"Capital émis","bilanLine_capital_non_appele":"Capital non appelé","bilanLine_primes_reserves":"Primes et réserves","bilanLine_ecart_reevaluation":"Écart de réévaluation","bilanLine_ecart_equivalence":"Écart d’équivalence","bilanLine_resultat_net":"Résultat net","bilanLine_autres_capitaux_propres":"Autres capitaux propres / report à nouveau","bilanLine_passif_non_courant":"PASSIF NON COURANT","bilanLine_emprunts_dettes_financieres":"Emprunts et dettes financières","bilanLine_impots_differes_passif":"Impôts différés passif","bilanLine_autres_dettes_non_courantes":"Autres dettes non courantes","bilanLine_provisions_produits_constates":"Provisions et produits constatés d’avance","bilanLine_passif_courant":"PASSIF COURANT","bilanLine_fournisseurs_comptes_rattaches":"Fournisseurs et comptes rattachés","bilanLine_impots_taxes_passif":"Impôts et taxes","bilanLine_autres_dettes":"Autres dettes","bilanLine_tresorerie_passif":"Trésorerie passif"});
Object.assign(TRANSLATIONS.ar,{"assignedToRecord":"يُعيّن عند التسجيل","assignee":"المسؤول","dueDate":"تاريخ الاستحقاق","linkedInvoicesOrdersTransactions":"الفواتير والطلبيات والمعاملات المرتبطة","searchLinkMultipleDocuments":"البحث عن عدة مستندات وربطها","createTaskTitle":"إنشاء مهمة (العنوان)","inspection":"المفتشية","baseRevenue":"الأساس/رقم الأعمال","amountDue":"المبلغ المستحق","balance":"الرصيد","taxInspections":"المفتشيات الضريبية","newG50":"تصريح G50 جديد","newIBS":"تصريح IBS جديد","newBilan":"تصريح الميزانية الجديد","collectedVat":"ضريبة القيمة المضافة المحصلة","deductibleVat":"ضريبة القيمة المضافة القابلة للخصم","totalAmountDue":"إجمالي المبلغ المستحق","productsCoveredG50":"المنتجات المعنية بتصريح G50","noProductFilter":"لا يوجد مرشح للمنتجات: تُعرض جميع فواتير البيع.","associatedPurchaseInvoices":"فواتير الشراء المرتبطة","associatedSalesInvoices":"فواتير البيع المرتبطة","noInvoice":"لا توجد فاتورة","taxableProfit":"الربح الخاضع للضريبة","taxInspection":"المفتشية الضريبية","taxArticleNumber":"رقم المادة الضريبية (NAI)","filingDate":"تاريخ الإيداع","nif":"رقم التعريف الجبائي NIF","equity":"حقوق الملكية","nonCurrentAssets":"الأصول غير الجارية","liabilities":"الخصوم","assets":"الأصول","totalLiabilities":"إجمالي الخصوم","totalAssets":"إجمالي الأصول","fiscalAmountPayment":"المبلغ الجبائي المستحق / الدفع المرتبط","detailedNotes":"ملاحظات مفصلة","userAccounts":"حسابات المستخدمين","userAccountsDescription":"الحسابات والأدوار والموظفون المرتبطون والتفعيل وطلبات كلمات المرور.","accounts":"الحسابات","passwordResetRequests":"طلبات إعادة تعيين كلمة المرور","smtpConfiguration":"إعداد SMTP","newAccount":"حساب جديد","enableDemoAccounts":"تفعيل الحسابات التجريبية","showDemoAccounts":"عرض الحسابات التجريبية عند تسجيل الدخول","activationQrSize":"حجم رمز QR للتفعيل","cardsView":"بطاقات","listView":"قائمة","searchUsers":"البحث بالاسم أو المعرّف أو البريد أو الوصف","allRoles":"كل الأدوار","allAccountStatuses":"كل الحالات","activeAccounts":"الحسابات النشطة","inactiveAccounts":"الحسابات غير النشطة","active":"نشط","inactive":"غير نشط","role":"الدور","linkedEmployee":"الموظف المرتبط","displayName":"اسم العرض","username":"اسم المستخدم","email":"البريد الإلكتروني","accountDescription":"وصف الحساب","specificPermissions":"صلاحيات مخصصة","accordingToRole":"حسب الدور","lastLogin":"آخر تسجيل دخول","password":"كلمة المرور","activation":"التفعيل","createAccount":"إنشاء حساب","editAccount":"تعديل الحساب","accountActive":"الحساب نشط","linkedActiveEmployee":"موظف نشط مرتبط","none":"لا شيء","generateSecurePassword":"إنشاء كلمة مرور آمنة","yes":"نعم","no":"لا","request":"الطلب","user":"المستخدم","allRequestStatuses":"كل حالات الطلب","searchResetRequests":"البحث عن طلب أو مستخدم أو بريد إلكتروني","pending":"قيد الانتظار","approved":"موافق عليها","rejected":"مرفوضة","approve":"موافقة","approveEmail":"موافقة وإرسال بريد","reject":"رفض","requestDetails":"تفاصيل الطلب","processRequest":"معالجة الطلب","requestedAt":"تاريخ الطلب","processedAt":"تاريخ المعالجة","processedBy":"عولجت بواسطة","requestStatus":"حالة الطلب","noRequest":"لا توجد طلبات.","smtpDescription":"إعداد آمن لخادم البريد للتفعيل وإعادة التعيين. تبقى كلمة المرور في ذاكرة الخادم فقط.","smtpHost":"مضيف SMTP","port":"المنفذ","security":"الأمان","smtpUser":"مستخدم SMTP","smtpPassword":"كلمة مرور SMTP","state":"الحالة","enabled":"مفعّل","disabled":"معطّل","senderName":"اسم المرسل","senderAddress":"عنوان المرسل","verifyTlsCertificate":"التحقق من شهادة TLS","testSend":"اختبار الإرسال","saveSmtp":"حفظ SMTP","translationManager":"مدير الترجمات واللغات","translationManagerDescription":"تحرير القاموس ثلاثي اللغات في الوقت الحقيقي وإضافة مفاتيح مخصصة وتصدير حزم اللغات.","coverageAudit":"تدقيق التغطية","configurableLists":"القوائم القابلة للتهيئة","newTranslationKey":"مفتاح ترجمة جديد","exportJson":"تصدير JSON","customOverride":"تجاوز مخصص:","keyIdentifier":"معرّف المفتاح (Key)","auditDescription":"سجل محمي لعمليات المستخدمين والعروض وحركات المخزون.","searchAction":"البحث عن إجراء","filterErpModule":"التصفية حسب وحدة ERP","allModules":"كل الوحدات","editAuditEntry":"تعديل إدخال تدقيق","auditEntryDetails":"تفاصيل إدخال التدقيق","modifiedFields":"الحقول المعدلة","before":"قبل","after":"بعد","timestamp":"الطابع الزمني","manageI18n":"إدارة الترجمة","architectureRoadmap":"البنية وخريطة الطريق","barcodeLabel":"ملصق الباركود","logos":"الشعارات","paymentsBanking":"المدفوعات والبنوك","vatRatesMenu":"نسب ضريبة القيمة المضافة","typesNumbering":"الأنواع والترقيم","checklistTemplates":"قوالب قوائم التحقق","rolesPermissions":"الأدوار والصلاحيات","rolesPermissionsDescription":"تحكم دقيق حسب الوحدة والإجراء. تسري التغييرات عند التنقل التالي.","generalSettingsDescription":"بيانات الشركة الجبائية و4 سمات أصلية وموصلات قواعد البيانات وأدوات التصدير.","settingsSummary":"الإعداد • قاعدة البيانات • السمات • النسخ الاحتياطية","administratorFullAccess":"المشرف (صلاحية كاملة)","importExportManager":"مسؤول الاستيراد والتصدير","stockManager":"مدير المخزون","readOnlyViewer":"مراقب (قراءة فقط)","salesEmployee":"موظف المبيعات (POS وB2B)","tenderManager":"مسؤول المناقصات","companyDetails":"بيانات شركة ساري سيستام","companyDetailsDescription":"تظهر هذه المعلومات رسميًا في رأس الفواتير ووصولات التسليم وتقارير المناقصات.","saveInformation":"حفظ المعلومات","identityLocation":"الهوية والموقع","legalCompanyName":"الاسم القانوني / اسم الشركة *","subtitleActivity":"العنوان الفرعي والنشاط","fullAddress":"العنوان الكامل (المقر / المستودع الرئيسي)","phoneNumbers":"رقم (أرقام) الهاتف","officialEmail":"البريد الإلكتروني الرسمي","taxIdNumber":"NIF (رقم التعريف الجبائي)","tradeRegister":"RC (السجل التجاري)","statisticalId":"NIS (رقم التعريف الإحصائي)","taxArticleId":"AI (رقم المادة الضريبية)","bankDetails":"البيانات البنكية (RIB BNA/CPA/BEA)","fiscalBankIdentifiers":"المعرّفات الجبائية والبنكية (الجزائر)","algeriaVatRate":"نسبة ضريبة القيمة المضافة في الجزائر (%)","mainCurrency":"العملة الرئيسية","noDefaultAccount":"لا يوجد حساب افتراضي","manageCurrencies":"إدارة العملات","nativeThemes":"السمات الأصلية (نمط Apple / عرض كامل)","nativeThemesDescription":"اختر واحدًا من السمات الأصلية الأربعة المصممة للتكيف مع إضاءة المستودعات واحتياجات الفريق الطبي البصرية.","sariClinicalDescription":"أزرق مخضر سريري هادئ — ألوان باردة ورصينة مثالية للشاشات كثيفة البيانات.","sariSunsetDescription":"كهرماني وبرتقالي دافئ — ألوان ديناميكية للوحدات التجارية.","sariMidnightDescription":"وضع داكن أصلي حقيقي — تباين عالٍ محسّن للعمل الليلي في المستودع.","selectTheme":"اختيار ←","databaseConnectorDescription":"اختبار حقيقي على الخادم لـ MySQL وPostgreSQL وMongoDB. تبقى الأسرار المدخلة في ذاكرة الخادم فقط، باستثناء SARI_DB_PASSWORD من البيئة.","databaseType":"نوع قاعدة البيانات","hostRequired":"المضيف *","portRequired":"المنفذ * (أرقام فقط)","databaseNameRequired":"اسم قاعدة البيانات *","dbUsername":"اسم المستخدم","dbPassword":"كلمة المرور","dbSecretHelper":"لا تُكتب أبدًا في .runtime. تبقى القيمة المدخلة في الواجهة متاحة في ذاكرة الخادم حتى إعادة تشغيله.","ssl":"SSL","dbDisabled":"معطّل","dbEnabled":"مفعّل","activeBackend":"الخلفية النشطة","indexedDbOnly":"لا — IndexedDB فقط","syncViaApi":"نعم — مزامنة عبر API","testForReal":"اختبار فعلي","testSave":"اختبار وحفظ","migrateIndexedDb":"ترحيل IndexedDB ← {database}","migrationDescription":"نقل متكرر آمن لكل جدول/مجموعة مع التحقق من الكتابة في الهدف وتقرير مفصل.","preValidate":"تحقق مسبق","startMigration":"بدء الترحيل","diagnosticConsole":"وحدة التشخيص","diagnosticConsoleDescription":"محاولات الاتصال وخطوات الترحيل في الوقت الحقيقي.","noEvent":"لا توجد أحداث.","clear":"مسح","connectionAttempt":"محاولة اتصال","connectionStep":"خطوة اتصال","connectionSuccess":"تم الاتصال بنجاح","connectionFailure":"فشل الاتصال","configurationSaved":"تم حفظ الإعداد","migrationPreflight":"التحقق المسبق للترحيل","migrationBatchStart":"بدء دفعة الترحيل","migrationRecordFailure":"فشل سجل","migrationBatchComplete":"اكتملت دفعة الترحيل","migrationSchemaCreated":"تم إنشاء مخطط الترحيل","standardProductLabel":"ملصق المنتج القياسي","barcodeDescription":"استخدم المتغيرات {code} (المرجع) و{sku} و{barcode} و{hash} (المفتاح المشفر) و{id}. لا يُضاف المفتاح المشفر إلا عند تحديد خيار « المفتاح المشفر في QR ».","applicationLogo":"شعار التطبيق","financialDocumentsLogo":"شعار المستندات المالية","financialLogoDescription":"شعار مستقل للفواتير وعروض الأسعار والطلبيات ووصولات التسليم. يُستخدم في الرأس وبوابة الموظف.","dragImageHere":"اسحب صورة هنا","verificationSecretKey":"مفتاح التحقق السري","verificationUrl":"رابط التحقق","addAccount":"+ حساب","addCoupon":"+ قسيمة","addReferrer":"+ مُحيل","bilanLine_actif_non_courant":"الأصول غير الجارية","bilanLine_ecart_acquisition_goodwill":"فرق الاقتناء / الشهرة","bilanLine_immobilisations_incorporelles":"الأصول غير الملموسة","bilanLine_immobilisations_corporelles":"الأصول الملموسة","bilanLine_terrains":"الأراضي","bilanLine_constructions":"المباني","bilanLine_concessions":"الامتيازات","bilanLine_installations_techniques":"المنشآت التقنية والمعدات والأدوات","bilanLine_autres_immobilisations_corporelles":"أصول ملموسة أخرى","bilanLine_immobilisations_en_cours":"أصول قيد الإنجاز","bilanLine_immobilisations_financieres":"الأصول المالية الثابتة","bilanLine_titres_participation":"استثمارات بطريقة حقوق الملكية / مساهمات","bilanLine_autres_participations_creances":"مساهمات وذمم مرتبطة أخرى","bilanLine_autres_titres_immobilises":"سندات ثابتة أخرى","bilanLine_prets_actifs_non_courants":"قروض وأصول مالية غير جارية أخرى","bilanLine_impots_differes_actif":"أصول ضريبية مؤجلة","bilanLine_actif_courant":"الأصول الجارية","bilanLine_stocks_encours":"المخزونات والأعمال الجارية","bilanLine_creances_emplois_assimiles":"الذمم والاستخدامات المماثلة","bilanLine_clients":"العملاء","bilanLine_autres_debiteurs":"مدينون آخرون","bilanLine_impots_taxes_actif":"الضرائب والرسوم المماثلة","bilanLine_autres_creances_actifs_courants":"ذمم وأصول جارية أخرى","bilanLine_disponibilites_assimiles":"النقد وما يعادله","bilanLine_placements_financiers":"استثمارات وأصول مالية جارية أخرى","bilanLine_tresorerie_actif":"نقدية الأصول","bilanLine_capitaux_propres":"حقوق الملكية","bilanLine_capital_emis":"رأس المال المصدر","bilanLine_capital_non_appele":"رأس المال غير المطلوب","bilanLine_primes_reserves":"العلاوات والاحتياطيات","bilanLine_ecart_reevaluation":"فائض إعادة التقييم","bilanLine_ecart_equivalence":"فرق حقوق الملكية","bilanLine_resultat_net":"صافي النتيجة","bilanLine_autres_capitaux_propres":"حقوق ملكية أخرى / أرباح محتجزة","bilanLine_passif_non_courant":"الخصوم غير الجارية","bilanLine_emprunts_dettes_financieres":"القروض والديون المالية","bilanLine_impots_differes_passif":"خصوم ضريبية مؤجلة","bilanLine_autres_dettes_non_courantes":"ديون غير جارية أخرى","bilanLine_provisions_produits_constates":"المخصصات والإيرادات المؤجلة","bilanLine_passif_courant":"الخصوم الجارية","bilanLine_fournisseurs_comptes_rattaches":"الموردون والحسابات المرتبطة","bilanLine_impots_taxes_passif":"الضرائب والرسوم","bilanLine_autres_dettes":"ديون أخرى","bilanLine_tresorerie_passif":"نقدية الخصوم"});
Object.assign(TRANSLATIONS.en,{"assignedToRecord":"Assigned to record","assignee":"Assignee","dueDate":"Due date","linkedInvoicesOrdersTransactions":"Linked invoices, orders and transactions","searchLinkMultipleDocuments":"Search and link multiple documents","createTaskTitle":"Create a task (Title)","inspection":"Inspection","baseRevenue":"Base/Revenue (CA)","amountDue":"Amount Due","balance":"Balance","taxInspections":"Tax Inspections","newG50":"New G50 Declaration","newIBS":"New IBS Declaration","newBilan":"New Bilan Declaration","collectedVat":"Collected VAT","deductibleVat":"Deductible VAT","totalAmountDue":"Total amount due","productsCoveredG50":"Products covered by this G50","noProductFilter":"No product filter: all sales invoices are shown.","associatedPurchaseInvoices":"Associated purchase invoices","associatedSalesInvoices":"Associated sales invoices","noInvoice":"No invoice","taxableProfit":"Taxable profit","taxInspection":"Tax inspection","taxArticleNumber":"Tax article number (NAI)","filingDate":"Filing date","nif":"NIF","equity":"EQUITY","nonCurrentAssets":"NON-CURRENT ASSETS","liabilities":"LIABILITIES","assets":"ASSETS","totalLiabilities":"Total liabilities","totalAssets":"Total assets","fiscalAmountPayment":"Fiscal amount due / associated payment","detailedNotes":"Detailed notes","userAccounts":"User Accounts","userAccountsDescription":"Accounts, roles, linked employees, activations and password requests.","accounts":"Accounts","passwordResetRequests":"Password Reset Requests","smtpConfiguration":"SMTP Configuration","newAccount":"New Account","enableDemoAccounts":"Enable demo accounts","showDemoAccounts":"Show demo accounts on login","activationQrSize":"Activation QR size","cardsView":"Cards","listView":"List","searchUsers":"Search by name, username, email or description","allRoles":"All roles","allAccountStatuses":"All statuses","activeAccounts":"Active accounts","inactiveAccounts":"Inactive accounts","active":"Active","inactive":"Inactive","role":"Role","linkedEmployee":"Linked employee","displayName":"Display name","username":"Username","email":"Email","accountDescription":"Account description","specificPermissions":"Specific permissions","accordingToRole":"According to role","lastLogin":"Last login","password":"Password","activation":"Activation","createAccount":"Create account","editAccount":"Edit account","accountActive":"Active account","linkedActiveEmployee":"Linked active employee","none":"None","generateSecurePassword":"Generate a secure password","yes":"Yes","no":"No","request":"Request","user":"User","allRequestStatuses":"All request statuses","searchResetRequests":"Search requests, users or email","pending":"Pending","approved":"Approved","rejected":"Rejected","approve":"Approve","approveEmail":"Approve & email","reject":"Reject","requestDetails":"Request details","processRequest":"Process request","requestedAt":"Requested at","processedAt":"Processed at","processedBy":"Processed by","requestStatus":"Request status","noRequest":"No requests.","smtpDescription":"Secure mail-server configuration for activations and resets. The password remains in server memory only.","smtpHost":"SMTP host","port":"Port","security":"Security","smtpUser":"SMTP user","smtpPassword":"SMTP password","state":"State","enabled":"Enabled","disabled":"Disabled","senderName":"Sender name","senderAddress":"Sender address","verifyTlsCertificate":"Verify TLS certificate","testSend":"Test sending","saveSmtp":"Save SMTP","translationManager":"Translation & Language Manager","translationManagerDescription":"Real-time editing of the trilingual dictionary, adding custom keys, and exporting language packs.","coverageAudit":"Coverage Audit","configurableLists":"Configurable Lists","newTranslationKey":"New Translation Key","exportJson":"Export JSON","customOverride":"Custom override:","keyIdentifier":"Key Identifier (Key)","auditDescription":"Tamper-aware logging of user operations, bid submissions, and stock movements.","searchAction":"Search an action","filterErpModule":"Filter by ERP Module","allModules":"All Modules","editAuditEntry":"Edit an Audit Entry","auditEntryDetails":"Audit Entry Details","modifiedFields":"Modified fields","before":"Before","after":"After","timestamp":"Timestamp","manageI18n":"Manage i18n","architectureRoadmap":"Architecture & Roadmap","barcodeLabel":"Barcode Label","logos":"Logos","paymentsBanking":"Payments & Banking","vatRatesMenu":"VAT Rates","typesNumbering":"Types & Numbering","checklistTemplates":"Checklist Templates","rolesPermissions":"Roles & Permissions","rolesPermissionsDescription":"Granular control per module and action. Changes take effect on next navigation.","generalSettingsDescription":"Company fiscal details, 4 native themes, database connectors (MySQL/PostgreSQL/MongoDB), and export tools.","settingsSummary":"Config • DB • Themes • Backups","administratorFullAccess":"Administrator (Full Access)","importExportManager":"Import/Export Manager","stockManager":"Stock Manager","readOnlyViewer":"Read-Only Viewer","salesEmployee":"Sales Employee (POS & B2B)","tenderManager":"Tender Manager","companyDetails":"SARI SYSTÈMES Company Details","companyDetailsDescription":"This information officially appears on the header of Invoices, Delivery Notes (BL), and tender reports.","saveInformation":"Save Information","identityLocation":"Identity & Location","legalCompanyName":"Legal/Company Name*","subtitleActivity":"Subtitle & Activity","fullAddress":"Full Address (HQ / Main Warehouse)","phoneNumbers":"Phone number(s)","officialEmail":"Official Email","taxIdNumber":"NIF (Tax ID Number)","tradeRegister":"RC (Trade Register)","statisticalId":"NIS (Statistical ID Number)","taxArticleId":"AI (Tax Article Number)","bankDetails":"Bank Details (RIB BNA/CPA/BEA)","fiscalBankIdentifiers":"Fiscal & Bank Identifiers (Algeria)","algeriaVatRate":"VAT Rate Algeria (%)","mainCurrency":"Main Currency","noDefaultAccount":"No default account","manageCurrencies":"Manage currencies","nativeThemes":"Native Themes (Apple Style / Full-Width)","nativeThemesDescription":"Select one of the 4 native themes designed to adapt to warehouse lighting conditions and the medical team’s visual needs.","sariClinicalDescription":"Sober Clinical Teal — cool, sober blue-green tones, ideal for data-dense screens (inventory, BPU, reports).","sariSunsetDescription":"Warm Amber & Orange — dynamic warm tones designed for commercial modules (tenders and POS sales).","sariMidnightDescription":"True Native Dark Mode — a true high-contrast dark mode optimized for night-shift warehouse work.","selectTheme":"Select →","databaseConnectorDescription":"Real server-side test for MySQL, PostgreSQL, and MongoDB. Entered secrets remain server-memory-only, except for SARI_DB_PASSWORD provided via the environment.","databaseType":"Database Type","hostRequired":"Host*","portRequired":"Port* (numbers only)","databaseNameRequired":"Database Name*","dbUsername":"Username","dbPassword":"Password","dbSecretHelper":"Never written to .runtime. A UI-entered value stays available in server memory until the server restarts.","ssl":"SSL","dbDisabled":"Disabled","dbEnabled":"Enabled","activeBackend":"Active Backend","indexedDbOnly":"No — IndexedDB only","syncViaApi":"Yes — sync via API","testForReal":"Test for real","testSave":"Test & Save","migrateIndexedDb":"Migrate IndexedDB ← {database}","migrationDescription":"Idempotent transfer per table/collection, write verification against the target, and a detailed report.","preValidate":"Pre-validate","startMigration":"Start Migration","diagnosticConsole":"Diagnostic Console","diagnosticConsoleDescription":"Real-time connection attempts and migration steps.","noEvent":"No events.","clear":"Clear","connectionAttempt":"Connection attempt","connectionStep":"Connection step","connectionSuccess":"Connection successful","connectionFailure":"Connection failed","configurationSaved":"Configuration saved","migrationPreflight":"Migration preflight","migrationBatchStart":"Migration batch started","migrationRecordFailure":"Record migration failed","migrationBatchComplete":"Migration batch complete","migrationSchemaCreated":"Migration schema created","standardProductLabel":"Standard Product Label","barcodeDescription":"Use the variables {code} (reference), {sku}, {barcode}, {hash} (hashed key), and {id}. The hashed key is only added if the “Hashed key in QR” option is checked.","applicationLogo":"Application Logo","financialDocumentsLogo":"Financial Documents Logo","financialLogoDescription":"Independent logo for invoices, quotes, orders, and delivery notes. Used in the header and the employee portal.","dragImageHere":"Drag an image here","verificationSecretKey":"Verification Secret Key","verificationUrl":"Verification URL","addAccount":"+ Account","addCoupon":"+ Coupon","addReferrer":"+ Referrer","bilanLine_actif_non_courant":"NON-CURRENT ASSETS","bilanLine_ecart_acquisition_goodwill":"Goodwill","bilanLine_immobilisations_incorporelles":"Intangible assets","bilanLine_immobilisations_corporelles":"Tangible assets","bilanLine_terrains":"Land","bilanLine_constructions":"Buildings","bilanLine_concessions":"Concessions","bilanLine_installations_techniques":"Technical installations, equipment and tools","bilanLine_autres_immobilisations_corporelles":"Other tangible assets","bilanLine_immobilisations_en_cours":"Assets under construction","bilanLine_immobilisations_financieres":"Financial assets","bilanLine_titres_participation":"Equity-accounted securities / interests","bilanLine_autres_participations_creances":"Other interests and related receivables","bilanLine_autres_titres_immobilises":"Other non-current securities","bilanLine_prets_actifs_non_courants":"Loans and other non-current financial assets","bilanLine_impots_differes_actif":"Deferred tax assets","bilanLine_actif_courant":"CURRENT ASSETS","bilanLine_stocks_encours":"Inventories and work in progress","bilanLine_creances_emplois_assimiles":"Receivables and similar assets","bilanLine_clients":"Customers","bilanLine_autres_debiteurs":"Other debtors","bilanLine_impots_taxes_actif":"Taxes and similar assets","bilanLine_autres_creances_actifs_courants":"Other receivables and current assets","bilanLine_disponibilites_assimiles":"Cash and equivalents","bilanLine_placements_financiers":"Investments and other current financial assets","bilanLine_tresorerie_actif":"Asset cash position","bilanLine_capitaux_propres":"EQUITY","bilanLine_capital_emis":"Issued capital","bilanLine_capital_non_appele":"Uncalled capital","bilanLine_primes_reserves":"Premiums and reserves","bilanLine_ecart_reevaluation":"Revaluation surplus","bilanLine_ecart_equivalence":"Equity-method difference","bilanLine_resultat_net":"Net income","bilanLine_autres_capitaux_propres":"Other equity / retained earnings","bilanLine_passif_non_courant":"NON-CURRENT LIABILITIES","bilanLine_emprunts_dettes_financieres":"Borrowings and financial liabilities","bilanLine_impots_differes_passif":"Deferred tax liabilities","bilanLine_autres_dettes_non_courantes":"Other non-current liabilities","bilanLine_provisions_produits_constates":"Provisions and deferred income","bilanLine_passif_courant":"CURRENT LIABILITIES","bilanLine_fournisseurs_comptes_rattaches":"Suppliers and related accounts","bilanLine_impots_taxes_passif":"Taxes","bilanLine_autres_dettes":"Other liabilities","bilanLine_tresorerie_passif":"Liability cash position"});

// Supplemental translations for Sections 265–288.
Object.assign(TRANSLATIONS.fr,{"editTask":"Modifier la tâche","taxableRevenue":"Chiffre d’affaires taxable","newFiscalDeclaration":"Nouvelle déclaration fiscale","documentDetails":"Détail du document","previewInvoice":"Aperçu facture","product":"Produit","quantity":"Quantité","price":"Prix","total":"Total","status":"Statut","date":"Date","view":"Voir","edit":"Modifier","delete":"Supprimer","add":"Ajouter","close":"Fermer","actionsHeader":"Actions","administratorRequired":"Accès Administrateur requis.","secureAdministration":"Administration sécurisée","noDataFound":"Aucune donnée","commaSeparated":"séparées par virgules","temporaryPassword":"Mot de passe temporaire","newPassword":"Nouveau mot de passe","activationLink":"Lien d’activation","resetLink":"Lien de réinitialisation","deleteUserConfirm":"Supprimer ce compte utilisateur ?","rejectRequestConfirm":"Rejeter cette demande ?","emailSentAutomatically":"Email envoyé automatiquement.","copyShareManually":"Copiez et partagez manuellement ce contenu.","copy":"Copier","copiedClipboard":"Copié dans le presse-papiers.","keepCurrentSecret":"Conserver le secret actuel","smtpSecretHelper":"Jamais enregistré sur disque depuis cette interface.","smtpSaved":"SMTP enregistré.","testEmailSent":"Email de test envoyé.","connectionPassword":"Mot de passe de connexion","externalBackendActive":"BACKEND EXTERNE ACTIF","indexedDbOffline":"INDEXEDDB HORS LIGNE","databaseConnector":"Connexion base de données externe","offlineFirstArchitecture":"Architecture offline-first :","offlineFirstDescription":"IndexedDB reste le cache local et la file de synchronisation. La cible active reçoit ensuite les mutations via le connecteur serveur.","targetReady":"Cible prête.","targetNotReady":"Cible non prête.","diagnosticEvent":"Événement diagnostique","editCurrency":"Modifier la devise","newCurrency":"Nouvelle devise","currencyCode":"Code ISO","currencySymbol":"Symbole","defaultCurrencyProtected":"La devise DZD par défaut ne peut pas être supprimée.","deleteCurrencyConfirm":"Supprimer cette devise ?","permissionModule_dashboard":"Tableau de bord","permissionModule_inventory":"Stock et produits","permissionModule_tenders":"Appels d’offres","permissionModule_importExport":"Import / Export","permissionModule_suppliers":"Fournisseurs","permissionModule_sales":"Ventes","permissionModule_customers":"Clients","permissionModule_reports":"Rapports","permissionModule_documents":"Documents","permissionModule_hr":"Ressources humaines","permissionModule_tasks":"Tâches","permissionModule_portal":"Espace collaborateur","permissionModule_messages":"Messagerie","permissionModule_purchases":"Achats","permissionModule_ged":"GED","permissionModule_taxes":"Fiscalité","permissionModule_masterData":"Listes configurables","permissionModule_inventoryOps":"Opérations de stock","permissionModule_bulkImport":"Import de masse","permissionModule_api":"API et intégrations","permissionModule_users":"Comptes utilisateurs","permissionModule_vatRates":"Taux de TVA","permissionModule_documentCodes":"Types et numérotation","permissionModule_settings":"Paramètres"});
Object.assign(TRANSLATIONS.ar,{"editTask":"تعديل المهمة","taxableRevenue":"رقم الأعمال الخاضع للضريبة","newFiscalDeclaration":"تصريح جبائي جديد","documentDetails":"تفاصيل المستند","previewInvoice":"معاينة الفاتورة","product":"المنتج","quantity":"الكمية","price":"السعر","total":"الإجمالي","status":"الحالة","date":"التاريخ","view":"عرض","edit":"تعديل","delete":"حذف","add":"إضافة","close":"إغلاق","actionsHeader":"الإجراءات","administratorRequired":"يلزم وصول المشرف.","secureAdministration":"إدارة آمنة","noDataFound":"لا توجد بيانات","commaSeparated":"مفصولة بفواصل","temporaryPassword":"كلمة مرور مؤقتة","newPassword":"كلمة مرور جديدة","activationLink":"رابط التفعيل","resetLink":"رابط إعادة التعيين","deleteUserConfirm":"حذف حساب المستخدم هذا؟","rejectRequestConfirm":"رفض هذا الطلب؟","emailSentAutomatically":"تم إرسال البريد الإلكتروني تلقائيًا.","copyShareManually":"انسخ هذا المحتوى وشاركه يدويًا.","copy":"نسخ","copiedClipboard":"تم النسخ إلى الحافظة.","keepCurrentSecret":"الاحتفاظ بالسر الحالي","smtpSecretHelper":"لا تُحفظ على القرص من هذه الواجهة.","smtpSaved":"تم حفظ SMTP.","testEmailSent":"تم إرسال بريد الاختبار.","connectionPassword":"كلمة مرور الاتصال","externalBackendActive":"الخلفية الخارجية نشطة","indexedDbOffline":"INDEXEDDB غير متصل","databaseConnector":"اتصال قاعدة بيانات خارجية","offlineFirstArchitecture":"بنية دون اتصال أولاً:","offlineFirstDescription":"يبقى IndexedDB ذاكرة التخزين المحلية وقائمة المزامنة، ثم يتلقى الهدف النشط التغييرات عبر موصل الخادم.","targetReady":"الهدف جاهز.","targetNotReady":"الهدف غير جاهز.","diagnosticEvent":"حدث تشخيصي","editCurrency":"تعديل العملة","newCurrency":"عملة جديدة","currencyCode":"رمز ISO","currencySymbol":"الرمز","defaultCurrencyProtected":"لا يمكن حذف عملة DZD الافتراضية.","deleteCurrencyConfirm":"حذف هذه العملة؟","permissionModule_dashboard":"لوحة التحكم","permissionModule_inventory":"المخزون والمنتجات","permissionModule_tenders":"المناقصات","permissionModule_importExport":"الاستيراد / التصدير","permissionModule_suppliers":"الموردون","permissionModule_sales":"المبيعات","permissionModule_customers":"العملاء","permissionModule_reports":"التقارير","permissionModule_documents":"المستندات","permissionModule_hr":"الموارد البشرية","permissionModule_tasks":"المهام","permissionModule_portal":"بوابة الموظف","permissionModule_messages":"المراسلة","permissionModule_purchases":"المشتريات","permissionModule_ged":"إدارة الوثائق","permissionModule_taxes":"الجباية","permissionModule_masterData":"القوائم القابلة للتهيئة","permissionModule_inventoryOps":"عمليات المخزون","permissionModule_bulkImport":"استيراد جماعي","permissionModule_api":"API والتكاملات","permissionModule_users":"حسابات المستخدمين","permissionModule_vatRates":"نسب الضريبة","permissionModule_documentCodes":"الأنواع والترقيم","permissionModule_settings":"الإعدادات"});
Object.assign(TRANSLATIONS.en,{"editTask":"Edit task","taxableRevenue":"Taxable revenue","newFiscalDeclaration":"New fiscal declaration","documentDetails":"Document details","previewInvoice":"Invoice preview","product":"Product","quantity":"Quantity","price":"Price","total":"Total","status":"Status","date":"Date","view":"View","edit":"Edit","delete":"Delete","add":"Add","close":"Close","actionsHeader":"Actions","administratorRequired":"Administrator access required.","secureAdministration":"Secure Administration","noDataFound":"No data","commaSeparated":"comma-separated","temporaryPassword":"Temporary password","newPassword":"New password","activationLink":"Activation link","resetLink":"Reset link","deleteUserConfirm":"Delete this user account?","rejectRequestConfirm":"Reject this request?","emailSentAutomatically":"Email sent automatically.","copyShareManually":"Copy and share this content manually.","copy":"Copy","copiedClipboard":"Copied to clipboard.","keepCurrentSecret":"Keep current secret","smtpSecretHelper":"Never stored on disk from this interface.","smtpSaved":"SMTP saved.","testEmailSent":"Test email sent.","connectionPassword":"Connection password","externalBackendActive":"EXTERNAL BACKEND ACTIVE","indexedDbOffline":"INDEXEDDB OFFLINE","databaseConnector":"External Database Connection","offlineFirstArchitecture":"Offline-first architecture:","offlineFirstDescription":"IndexedDB remains the local cache and sync queue. The active target then receives mutations through the server connector.","targetReady":"Target ready.","targetNotReady":"Target not ready.","diagnosticEvent":"Diagnostic event","editCurrency":"Edit Currency","newCurrency":"New Currency","currencyCode":"ISO Code","currencySymbol":"Symbol","defaultCurrencyProtected":"The default DZD currency cannot be deleted.","deleteCurrencyConfirm":"Delete this currency?","permissionModule_dashboard":"Dashboard","permissionModule_inventory":"Inventory & Products","permissionModule_tenders":"Tenders","permissionModule_importExport":"Import / Export","permissionModule_suppliers":"Suppliers","permissionModule_sales":"Sales","permissionModule_customers":"Customers","permissionModule_reports":"Reports","permissionModule_documents":"Documents","permissionModule_hr":"Human Resources","permissionModule_tasks":"Tasks","permissionModule_portal":"Employee Portal","permissionModule_messages":"Messaging","permissionModule_purchases":"Purchases","permissionModule_ged":"GED","permissionModule_taxes":"Tax","permissionModule_masterData":"Configurable Lists","permissionModule_inventoryOps":"Inventory Operations","permissionModule_bulkImport":"Bulk Import","permissionModule_api":"API & Integrations","permissionModule_users":"User Accounts","permissionModule_vatRates":"VAT Rates","permissionModule_documentCodes":"Types & Numbering","permissionModule_settings":"Settings"});

Object.assign(TRANSLATIONS.fr,{addBilan:'+ Bilan'});Object.assign(TRANSLATIONS.ar,{addBilan:'+ الميزانية'});Object.assign(TRANSLATIONS.en,{addBilan:'+ Financial Statement'});
Object.assign(TRANSLATIONS.fr,{"sariClassicTagline":"Palette officielle SARI","sariClinicalTagline":"Teal clinique sobre","sariSunsetTagline":"Ambre & orange chaleureux","sariMidnightTagline":"Vrai mode sombre natif"});Object.assign(TRANSLATIONS.ar,{"sariClassicTagline":"لوحة ألوان ساري الرسمية","sariClinicalTagline":"أزرق مخضر سريري هادئ","sariSunsetTagline":"كهرماني وبرتقالي دافئ","sariMidnightTagline":"وضع داكن أصلي حقيقي"});Object.assign(TRANSLATIONS.en,{"sariClassicTagline":"Official SARI Palette","sariClinicalTagline":"Sober Clinical Teal","sariSunsetTagline":"Warm Amber & Orange","sariMidnightTagline":"True Native Dark Mode"});
Object.assign(TRANSLATIONS.fr,{"connectionSucceeded":"Connexion réussie.","connectionFailed":"Échec de connexion.","dbNotActive":"La cible doit être enregistrée et active avant la migration.","dbNotConfigured":"Enregistrez une base MySQL, PostgreSQL ou MongoDB avant la prévalidation.","connectionTimeout":"Délai de connexion dépassé. Vérifiez le réseau, le pare-feu et la liste blanche.","networkError":"Le serveur ne répond pas. Vérifiez votre connexion.","invalidServerResponse":"Réponse serveur invalide.","preflightNetworkError":"La prévalidation ne peut pas joindre le serveur.","connectionSuccessMark":"✓ Connexion réussie","connectionFailureMark":"✗ Échec de connexion","serverLabel":"Serveur","saveTargetBeforeMigration":"Enregistrez la nouvelle cible avant de migrer.","realConnectionInProgress":"Connexion réelle en cours…","maximum":"maximum"});Object.assign(TRANSLATIONS.ar,{"connectionSucceeded":"تم الاتصال بنجاح.","connectionFailed":"فشل الاتصال.","dbNotActive":"يجب حفظ الهدف وتفعيله قبل الترحيل.","dbNotConfigured":"احفظ قاعدة MySQL أو PostgreSQL أو MongoDB قبل التحقق المسبق.","connectionTimeout":"انتهت مهلة الاتصال. تحقق من الشبكة والجدار الناري والقائمة البيضاء.","networkError":"الخادم لا يستجيب. تحقق من اتصالك.","invalidServerResponse":"استجابة الخادم غير صالحة.","preflightNetworkError":"تعذر على التحقق المسبق الاتصال بالخادم.","connectionSuccessMark":"✓ تم الاتصال بنجاح","connectionFailureMark":"✗ فشل الاتصال","serverLabel":"الخادم","saveTargetBeforeMigration":"احفظ الهدف الجديد قبل الترحيل.","realConnectionInProgress":"جارٍ الاتصال الفعلي…","maximum":"الحد الأقصى"});Object.assign(TRANSLATIONS.en,{"connectionSucceeded":"Connection successful.","connectionFailed":"Connection failed.","dbNotActive":"The target must be saved and active before migration.","dbNotConfigured":"Save a MySQL, PostgreSQL, or MongoDB target before pre-validation.","connectionTimeout":"Connection timed out. Check the network, firewall, and allowlist.","networkError":"The server is not responding. Check your connection.","invalidServerResponse":"Invalid server response.","preflightNetworkError":"Pre-validation cannot reach the server.","connectionSuccessMark":"✓ Connection successful","connectionFailureMark":"✗ Connection failed","serverLabel":"Server","saveTargetBeforeMigration":"Save the new target before migrating.","realConnectionInProgress":"Real connection in progress…","maximum":"maximum"});
Object.assign(TRANSLATIONS.fr,{"connectionRefused":"Connexion refusée. Vérifiez que le serveur de base de données est démarré et que le port est ouvert.","hostNotFound":"Hôte introuvable. Vérifiez le nom DNS ou l’adresse IP.","mysqlAccessDenied":"Identifiant ou mot de passe MySQL incorrect.","mysqlDatabaseMissing":"La base MySQL demandée n’existe pas.","postgresAccessDenied":"Identifiant ou mot de passe PostgreSQL incorrect.","postgresDatabaseMissing":"La base PostgreSQL demandée n’existe pas.","mongoUnavailable":"Aucun serveur MongoDB joignable dans le délai imparti.","mongoRejected":"MongoDB a refusé la connexion ou l’opération."});Object.assign(TRANSLATIONS.ar,{"connectionRefused":"تم رفض الاتصال. تحقق من تشغيل خادم قاعدة البيانات وفتح المنفذ.","hostNotFound":"المضيف غير موجود. تحقق من اسم DNS أو عنوان IP.","mysqlAccessDenied":"اسم مستخدم أو كلمة مرور MySQL غير صحيحة.","mysqlDatabaseMissing":"قاعدة MySQL المطلوبة غير موجودة.","postgresAccessDenied":"اسم مستخدم أو كلمة مرور PostgreSQL غير صحيحة.","postgresDatabaseMissing":"قاعدة PostgreSQL المطلوبة غير موجودة.","mongoUnavailable":"لا يمكن الوصول إلى خادم MongoDB ضمن المهلة.","mongoRejected":"رفض MongoDB الاتصال أو العملية."});Object.assign(TRANSLATIONS.en,{"connectionRefused":"Connection refused. Check that the database server is running and the port is open.","hostNotFound":"Host not found. Check the DNS name or IP address.","mysqlAccessDenied":"Incorrect MySQL username or password.","mysqlDatabaseMissing":"The requested MySQL database does not exist.","postgresAccessDenied":"Incorrect PostgreSQL username or password.","postgresDatabaseMissing":"The requested PostgreSQL database does not exist.","mongoUnavailable":"No MongoDB server was reachable within the timeout.","mongoRejected":"MongoDB rejected the connection or operation."});
Object.assign(TRANSLATIONS.fr,{"auditUser":"Utilisateur","userId":"ID utilisateur","typeId":"Type / ID","field":"Champ","gedAttachments":"Pièces GED","system":"Système","legacyAuditNoDiff":"Ancienne entrée sans différence structurée."});Object.assign(TRANSLATIONS.ar,{"auditUser":"المستخدم","userId":"معرّف المستخدم","typeId":"النوع / المعرّف","field":"الحقل","gedAttachments":"مرفقات GED","system":"النظام","legacyAuditNoDiff":"إدخال قديم بلا فروق منظمة."});Object.assign(TRANSLATIONS.en,{"auditUser":"User","userId":"User ID","typeId":"Type / ID","field":"Field","gedAttachments":"GED Attachments","system":"System","legacyAuditNoDiff":"Legacy entry without a structured diff."});
// Sections 289–290: standalone SMTP and localized account email templates.
Object.assign(TRANSLATIONS.fr,{"backToSettings":"Retour aux paramètres","mailServerSettings":"Paramètres du serveur de messagerie","smtpStandaloneHelp":"Cette page autonome est réservée à la configuration SMTP globale de SARI Système.","smtpSecretMemory":"Jamais écrit sur disque. La valeur reste en mémoire serveur jusqu’au redémarrage.","smtpSecurityNotice":"Le secret SMTP n’est jamais retourné par l’API ni inclus dans les exports applicatifs.","saveFailed":"Enregistrement impossible.","visualEditor":"Éditeur visuel","htmlSource":"Source HTML","preview":"Aperçu","insertPlaceholder":"Insérer un attribut","passwordReset":"Réinitialisation du mot de passe","accountActivation":"Activation du compte","customMessage":"Message personnalisé","emailSent":"Envoyé","emailFailed":"Échec de l’envoi","sendEmail":"Envoyer un email","emailTemplateManager":"Modèles d’email","newEmailTemplate":"Nouveau modèle","selectSingleUserToSend":"Utilisez l’action Envoyer sur le compte destinataire.","searchEmailTemplates":"Rechercher un modèle d’email","allEmailTypes":"Tous les types d’email","preconfigured":"Préconfiguré","noEmailTemplate":"Aucun modèle d’email.","sampleRecipient":"Destinataire SARI","customMessagePreview":"Votre message personnalisé apparaîtra ici.","passwordResetLink":"Lien de réinitialisation","emailPreview":"Aperçu de l’email","editEmailTemplate":"Modifier le modèle","sendType":"Type d’envoi","preconfiguredTemplate":"Modèle préconfiguré / par défaut","localizedVersion":"Version localisée","templateName":"Nom du modèle","emailSubject":"Objet de l’email","htmlContent":"Contenu HTML","cancel":"Annuler","saveTemplate":"Enregistrer le modèle","emailTemplateSaved":"Modèle d’email enregistré.","deleteEmailTemplateConfirm":"Supprimer ce modèle d’email ?","emailTemplateDeleted":"Modèle d’email supprimé.","userEmailRequired":"Une adresse email est requise pour ce compte.","secureEmailDelivery":"Envoi sécurisé","sendAccountEmail":"Envoyer un email au compte","messageTemplate":"Modèle de message","messageLanguage":"Langue du message","customMessageBody":"Corps du message personnalisé","placeholdersGeneratedOnSend":"Les QR et liens sécurisés sont générés au moment de l’envoi.","noMatchingTemplate":"Aucun modèle correspondant à ce type.","selectMessageTemplate":"Sélectionnez un modèle de message.","sending":"Envoi en cours…","emailSentSuccessfully":"Email envoyé et ajouté à l’historique.","sendHistory":"Historique des envois","noEmailHistory":"Aucun email envoyé à ce compte."});
Object.assign(TRANSLATIONS.ar,{"backToSettings":"العودة إلى الإعدادات","mailServerSettings":"إعدادات خادم البريد","smtpStandaloneHelp":"هذه الصفحة المستقلة مخصصة لإعداد SMTP العام لنظام SARI.","smtpSecretMemory":"لا تُكتب على القرص. تبقى القيمة في ذاكرة الخادم حتى إعادة التشغيل.","smtpSecurityNotice":"لا تُرجع واجهة API سر SMTP ولا يُضمّن في صادرات التطبيق.","saveFailed":"تعذر الحفظ.","visualEditor":"المحرر المرئي","htmlSource":"مصدر HTML","preview":"معاينة","insertPlaceholder":"إدراج سمة","passwordReset":"إعادة تعيين كلمة المرور","accountActivation":"تفعيل الحساب","customMessage":"رسالة مخصصة","emailSent":"تم الإرسال","emailFailed":"فشل الإرسال","sendEmail":"إرسال بريد إلكتروني","emailTemplateManager":"قوالب البريد الإلكتروني","newEmailTemplate":"قالب جديد","selectSingleUserToSend":"استخدم إجراء الإرسال على حساب المستلم.","searchEmailTemplates":"البحث عن قالب بريد إلكتروني","allEmailTypes":"كل أنواع البريد الإلكتروني","preconfigured":"مُعد مسبقاً","noEmailTemplate":"لا توجد قوالب بريد إلكتروني.","sampleRecipient":"مستلم SARI","customMessagePreview":"ستظهر رسالتك المخصصة هنا.","passwordResetLink":"رابط إعادة تعيين كلمة المرور","emailPreview":"معاينة البريد الإلكتروني","editEmailTemplate":"تعديل القالب","sendType":"نوع الإرسال","preconfiguredTemplate":"قالب مُعد مسبقاً / افتراضي","localizedVersion":"النسخة المترجمة","templateName":"اسم القالب","emailSubject":"موضوع البريد الإلكتروني","htmlContent":"محتوى HTML","cancel":"إلغاء","saveTemplate":"حفظ القالب","emailTemplateSaved":"تم حفظ قالب البريد الإلكتروني.","deleteEmailTemplateConfirm":"حذف قالب البريد الإلكتروني هذا؟","emailTemplateDeleted":"تم حذف قالب البريد الإلكتروني.","userEmailRequired":"يلزم عنوان بريد إلكتروني لهذا الحساب.","secureEmailDelivery":"إرسال آمن","sendAccountEmail":"إرسال بريد إلكتروني إلى الحساب","messageTemplate":"قالب الرسالة","messageLanguage":"لغة الرسالة","customMessageBody":"محتوى الرسالة المخصصة","placeholdersGeneratedOnSend":"يتم إنشاء رموز QR والروابط الآمنة عند الإرسال.","noMatchingTemplate":"لا يوجد قالب مطابق لهذا النوع.","selectMessageTemplate":"اختر قالب رسالة.","sending":"جارٍ الإرسال…","emailSentSuccessfully":"تم إرسال البريد وإضافته إلى السجل.","sendHistory":"سجل الإرسال","noEmailHistory":"لم يُرسل أي بريد إلى هذا الحساب."});
Object.assign(TRANSLATIONS.en,{"backToSettings":"Back to Settings","mailServerSettings":"Mail Server Settings","smtpStandaloneHelp":"This standalone page is dedicated to the global SARI System SMTP configuration.","smtpSecretMemory":"Never written to disk. The value remains in server memory until restart.","smtpSecurityNotice":"The SMTP secret is never returned by the API or included in application exports.","saveFailed":"Unable to save.","visualEditor":"Visual Editor","htmlSource":"HTML Source","preview":"Preview","insertPlaceholder":"Insert Placeholder","passwordReset":"Password Reset","accountActivation":"Account Activation","customMessage":"Custom Message","emailSent":"Sent","emailFailed":"Failed","sendEmail":"Send Email","emailTemplateManager":"Email Templates","newEmailTemplate":"New Template","selectSingleUserToSend":"Use the Send action on the recipient account.","searchEmailTemplates":"Search Email Templates","allEmailTypes":"All Email Types","preconfigured":"Preconfigured","noEmailTemplate":"No Email Templates.","sampleRecipient":"SARI Recipient","customMessagePreview":"Your custom message will appear here.","passwordResetLink":"Password Reset Link","emailPreview":"Email Preview","editEmailTemplate":"Edit Template","sendType":"Send Type","preconfiguredTemplate":"Preconfigured / Default Template","localizedVersion":"Localized Version","templateName":"Template Name","emailSubject":"Email Subject","htmlContent":"HTML Content","cancel":"Cancel","saveTemplate":"Save Template","emailTemplateSaved":"Email template saved.","deleteEmailTemplateConfirm":"Delete this email template?","emailTemplateDeleted":"Email template deleted.","userEmailRequired":"An email address is required for this account.","secureEmailDelivery":"Secure Delivery","sendAccountEmail":"Send Account Email","messageTemplate":"Message Template","messageLanguage":"Message Language","customMessageBody":"Custom Message Body","placeholdersGeneratedOnSend":"QR codes and secure links are generated when the message is sent.","noMatchingTemplate":"No template matches this type.","selectMessageTemplate":"Select a message template.","sending":"Sending…","emailSentSuccessfully":"Email sent and added to history.","sendHistory":"Send History","noEmailHistory":"No email has been sent to this account."});

// Sections 291–292: embedded email QR images and language-specific fonts.
Object.assign(TRANSLATIONS.fr,{"arabicEmailFont":"Police arabe des emails","frenchEmailFont":"Police française des emails","embeddedArabicFontHelp":"Police auto-hébergée et incorporée aux emails arabes.","embeddedFrenchFontHelp":"Police auto-hébergée et incorporée aux emails français et latins.","qrEmbeddingMode":"Incorporation des QR","inlineQrAttachment":"Image incorporée CID (recommandé)","base64DataUri":"URI base64 directe","qrEmbeddingHelp":"Les deux modes incorporent le PNG sans URL externe ; CID offre la meilleure compatibilité email."});
Object.assign(TRANSLATIONS.ar,{"arabicEmailFont":"خط البريد الإلكتروني العربي","frenchEmailFont":"خط البريد الإلكتروني الفرنسي","embeddedArabicFontHelp":"خط مستضاف ذاتياً ومضمّن في رسائل البريد العربية.","embeddedFrenchFontHelp":"خط مستضاف ذاتياً ومضمّن في رسائل البريد الفرنسية واللاتينية.","qrEmbeddingMode":"طريقة تضمين رمز QR","inlineQrAttachment":"صورة CID مضمّنة (موصى بها)","base64DataUri":"رابط بيانات base64 مباشر","qrEmbeddingHelp":"يضمّن الوضعان صورة PNG دون رابط خارجي؛ ويوفر CID أفضل توافق مع البريد الإلكتروني."});
Object.assign(TRANSLATIONS.en,{"arabicEmailFont":"Arabic Email Font","frenchEmailFont":"French Email Font","embeddedArabicFontHelp":"Self-hosted font embedded in Arabic emails.","embeddedFrenchFontHelp":"Self-hosted font embedded in French and Latin emails.","qrEmbeddingMode":"QR Embedding Mode","inlineQrAttachment":"Inline CID Image (Recommended)","base64DataUri":"Direct Base64 Data URI","qrEmbeddingHelp":"Both modes embed the PNG without an external URL; CID provides the best email-client compatibility."});

// SMTP diagnostics and credential-memory guidance.
Object.assign(TRANSLATIONS.fr,{"smtpPasswordReloadRequired":"Le serveur a redémarré et ne possède plus le mot de passe SMTP en mémoire. Saisissez-le à nouveau ou définissez SARI_SMTP_PASSWORD.","smtpCredentialsMissing":"Identifiants SMTP incomplets : saisissez de nouveau le mot de passe SMTP ou définissez SARI_SMTP_PASSWORD, puis réessayez.","smtpAuthenticationFailed":"Authentification SMTP refusée. Vérifiez l’identifiant, le mot de passe ou mot de passe d’application, et la politique d’authentification du fournisseur.","smtpDisabledError":"Activez le backend SMTP avant de tester l’envoi.","smtpTestFailed":"Échec du test SMTP."});
Object.assign(TRANSLATIONS.ar,{"smtpPasswordReloadRequired":"أُعيد تشغيل الخادم ولم تعد كلمة مرور SMTP موجودة في الذاكرة. أدخلها مجدداً أو عيّن SARI_SMTP_PASSWORD.","smtpCredentialsMissing":"بيانات اعتماد SMTP غير مكتملة: أدخل كلمة مرور SMTP مجدداً أو عيّن SARI_SMTP_PASSWORD ثم أعد المحاولة.","smtpAuthenticationFailed":"رُفضت مصادقة SMTP. تحقق من اسم المستخدم وكلمة المرور أو كلمة مرور التطبيق وسياسة المصادقة لدى المزود.","smtpDisabledError":"فعّل SMTP قبل اختبار الإرسال.","smtpTestFailed":"فشل اختبار SMTP."});
Object.assign(TRANSLATIONS.en,{"smtpPasswordReloadRequired":"The server restarted and no longer has the SMTP password in memory. Enter it again or define SARI_SMTP_PASSWORD.","smtpCredentialsMissing":"Incomplete SMTP credentials: enter the SMTP password again or define SARI_SMTP_PASSWORD, then retry.","smtpAuthenticationFailed":"SMTP authentication was rejected. Check the username, password or app password, and the provider authentication policy.","smtpDisabledError":"Enable SMTP before testing delivery.","smtpTestFailed":"SMTP test failed."});

// Current-user profile, personal space and password security.
Object.assign(TRANSLATIONS.fr,{"myProfile":"Mon profil","viewMyProfile":"Consulter mon profil","updatePassword":"Mettre à jour le mot de passe","editMyProfile":"Modifier mon profil","profilePhoto":"Photo de profil","phone":"Téléphone","address":"Adresse","employeeReference":"Référence employé","noLinkedEmployee":"Aucun dossier employé lié","position":"Poste","department":"Département","openPersonalSpace":"Ouvrir l’espace personnel","profileUpdated":"Profil mis à jour.","currentPassword":"Mot de passe actuel","newPassword":"Nouveau mot de passe","confirmNewPassword":"Confirmer le nouveau mot de passe","passwordRequirements":"Le nouveau mot de passe doit contenir au moins 10 caractères.","passwordMismatch":"Les mots de passe ne correspondent pas.","passwordTooShort":"Le nouveau mot de passe doit contenir au moins 10 caractères.","newPasswordMustDiffer":"Le nouveau mot de passe doit être différent du mot de passe actuel.","currentPasswordIncorrect":"Le mot de passe actuel est incorrect.","passwordChanged":"Mot de passe mis à jour avec succès.","passwordChangeFailed":"La mise à jour du mot de passe a échoué.","authenticationRequired":"Votre session a expiré. Reconnectez-vous.","personalProfileDescription":"Consultez vos informations personnelles et sécurisez votre compte.","viewProfileHelp":"Afficher mon compte et mon dossier personnel.","editProfileHelp":"Mettre à jour la photo et les coordonnées.","passwordSecurityHelp":"Changer mon mot de passe en toute sécurité.","personalSpace":"Espace personnel","personalSpaceDescription":"Carrière, informations RH, missions, documents et messagerie interne."});
Object.assign(TRANSLATIONS.ar,{"myProfile":"ملفي الشخصي","viewMyProfile":"عرض ملفي الشخصي","updatePassword":"تحديث كلمة المرور","editMyProfile":"تعديل ملفي الشخصي","profilePhoto":"الصورة الشخصية","phone":"الهاتف","address":"العنوان","employeeReference":"مرجع الموظف","noLinkedEmployee":"لا يوجد ملف موظف مرتبط","position":"المنصب","department":"القسم","openPersonalSpace":"فتح المساحة الشخصية","profileUpdated":"تم تحديث الملف الشخصي.","currentPassword":"كلمة المرور الحالية","newPassword":"كلمة المرور الجديدة","confirmNewPassword":"تأكيد كلمة المرور الجديدة","passwordRequirements":"يجب أن تحتوي كلمة المرور الجديدة على 10 أحرف على الأقل.","passwordMismatch":"كلمتا المرور غير متطابقتين.","passwordTooShort":"يجب أن تحتوي كلمة المرور الجديدة على 10 أحرف على الأقل.","newPasswordMustDiffer":"يجب أن تختلف كلمة المرور الجديدة عن الحالية.","currentPasswordIncorrect":"كلمة المرور الحالية غير صحيحة.","passwordChanged":"تم تحديث كلمة المرور بنجاح.","passwordChangeFailed":"فشل تحديث كلمة المرور.","authenticationRequired":"انتهت جلستك. سجّل الدخول مجدداً.","personalProfileDescription":"اطلع على معلوماتك الشخصية وقم بتأمين حسابك.","viewProfileHelp":"عرض حسابي وملفي الشخصي.","editProfileHelp":"تحديث الصورة ومعلومات الاتصال.","passwordSecurityHelp":"تغيير كلمة المرور بأمان.","personalSpace":"المساحة الشخصية","personalSpaceDescription":"المسار المهني ومعلومات الموارد البشرية والمهام والوثائق والمراسلة الداخلية."});
Object.assign(TRANSLATIONS.en,{"myProfile":"My Profile","viewMyProfile":"View My Profile","updatePassword":"Update Password","editMyProfile":"Edit My Profile","profilePhoto":"Profile Photo","phone":"Phone","address":"Address","employeeReference":"Employee Reference","noLinkedEmployee":"No linked employee record","position":"Position","department":"Department","openPersonalSpace":"Open Personal Space","profileUpdated":"Profile updated.","currentPassword":"Current Password","newPassword":"New Password","confirmNewPassword":"Confirm New Password","passwordRequirements":"The new password must contain at least 10 characters.","passwordMismatch":"Passwords do not match.","passwordTooShort":"The new password must contain at least 10 characters.","newPasswordMustDiffer":"The new password must be different from the current password.","currentPasswordIncorrect":"The current password is incorrect.","passwordChanged":"Password updated successfully.","passwordChangeFailed":"Password update failed.","authenticationRequired":"Your session has expired. Sign in again.","personalProfileDescription":"Review your personal information and secure your account.","viewProfileHelp":"View my account and personal record.","editProfileHelp":"Update photo and contact information.","passwordSecurityHelp":"Change my password securely.","personalSpace":"Personal Space","personalSpaceDescription":"Career, HR information, missions, documents, and internal messaging."});

// Compatibility bridge for scripts progressively converted from classic
// globals to isolated ES modules. Domain modules still consume these stable
// names while their imports are migrated incrementally.
globalThis.SARI_CONFIG = SARI_CONFIG;
globalThis.TRANSLATIONS = TRANSLATIONS;

export { SARI_CONFIG, TRANSLATIONS };

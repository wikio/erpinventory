import './styles.css';
import '../css/styles.css';
import './vendors';
import './icon-runtime';
import { SariCore } from './core';

window.SariCore = SariCore;

// Compatibility entry: each legacy file now executes as an isolated ES module,
// preserving its public window API while eliminating 45 parser-blocking tags.
import '../js/config.js';
import '../js/countries-data.js';
import '../js/db.js';
import '../js/reference-codes.js';
import '../js/document-security.js';
import '../js/document-translation.js';
import '../js/db-adapter.js';
import '../js/ui-copy.js';
import '../js/module-translations.js';
import '../js/i18n.js';
import '../js/translation-overlay.js';
import '../js/translation-coverage.js';
import '../js/option-catalog.js';
import '../js/auth.js';
import '../js/sync.js';
import '../js/utils.js';
import '../js/table-sort.js';
import '../js/dialogs.js';
import '../js/validation.js';
import '../js/managed-autocomplete.js';
import '../js/image-dropzone.js';
import '../js/rich-editor.js';
import '../js/template-engine.js';
import '../js/template-designer.js';
import '../js/document-regression.js';
import '../js/catalog-picker.js';
import '../js/partner-360.js';
import '../js/document-link-picker.js';
import '../js/reference-translations.js';
import '../js/documents.js';
import '../js/document-lifecycle.js';
import './module-loader';
import '../js/app.js';

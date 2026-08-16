import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('sections 265–288 integration contracts', () => {
  it('keeps internal invoice identifiers out of customer-facing template fields', () => {
    const designer = source('js/template-designer.js');
    const sales = source('js/modules/sales.js');
    const printFlow = sales.slice(sales.indexOf('async openPrintModal'), sales.indexOf('renderDesignerOutput'));
    expect(designer).not.toContain("'document.internalId'");
    expect(printFlow).toContain('TemplateEngine.renderPublic');
    expect(printFlow).not.toMatch(/Ordre:\s*\$\{o\.order/);
    expect(printFlow).not.toMatch(/ID technique:\s*\$\{o\.numericId/);
  });

  it('ships complete FR/AR/EN keys for fiscal, account, SMTP and settings screens', () => {
    const packs = ['fr', 'ar', 'en'].map(lang => JSON.parse(source(`content/translations/${lang}.json`)));
    const required = [
      'assignedToRecord', 'newG50', 'newIBS', 'newBilan', 'totalAmountDue',
      'bilanLine_immobilisations_corporelles', 'bilanLine_fournisseurs_comptes_rattaches',
      'userAccounts', 'passwordResetRequests', 'smtpConfiguration', 'translationManager',
      'editAuditEntry', 'rolesPermissionsDescription', 'mainCurrency', 'nativeThemes',
      'databaseConnectorDescription', 'standardProductLabel', 'financialDocumentsLogo',
      'verificationSecretKey', 'verificationUrl'
    ];
    for (const pack of packs) for (const key of required) expect(pack[key], `${pack._meta.language}:${key}`).toBeTruthy();
  });

  it('exposes row actions, consultation sheets, filters and a configurable currency catalog', () => {
    expect(source('js/modules/ged.js')).toContain("GEDModule.editRecord('${d.id}')");
    expect(source('js/modules/ged.js')).toContain("GEDModule.deleteFile('${d.id}')");
    expect(source('js/modules/hr.js')).toContain('async viewEmployee');
    expect(source('js/modules/hr.js')).toContain('async viewMission');
    expect(source('js/modules/users.js')).toContain('filteredUsers()');
    expect(source('js/modules/users.js')).toContain('filteredRequests()');
    expect(source('js/db.js')).toContain("listKey:'currency'");
    expect(source('js/modules/settings.js')).toContain("app.navigate('smtp')");
  });
});

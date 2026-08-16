'use strict';

const path = require('path');
const { AuthVault, securePassword } = require('../auth-vault');

function resetAdministrator(root, requestedPassword = '') {
  const vault = new AuthVault(root);
  const administrator = vault.find('admin') || vault.data.users.find(user => user.role === 'admin');
  if (!administrator) throw Error('Aucun compte Administrateur n’a été trouvé dans le coffre privé.');
  const supplied = String(requestedPassword || '').trim();
  const password = supplied || securePassword();
  if (password.length < 10) throw Error('Le nouveau mot de passe Administrateur doit contenir au moins 10 caractères.');
  const user = vault.update(administrator.id, { password, isActive: true });
  const stored = vault.find(administrator.id);
  stored.activationRequired = false;
  stored.passwordResetAt = new Date().toISOString();
  stored.passwordResetSource = 'local-recovery-script';
  vault.persist();
  if (!vault.verify(user.username, password)) throw Error('La vérification locale du nouveau mot de passe a échoué.');
  return { user, password, generated: !supplied, file: vault.file };
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const requested = process.env.SARI_ADMIN_RESET_PASSWORD || '';
    const result = resetAdministrator(root, requested);
    delete process.env.SARI_ADMIN_RESET_PASSWORD;
    console.log('\nCompte Administrateur réinitialisé avec succès.');
    console.log(`Identifiant : ${result.user.username}`);
    if (result.generated) {
      console.log(`Mot de passe temporaire : ${result.password}`);
      console.log('Copiez-le maintenant : il ne sera plus affiché et seul son hash est enregistré.');
    } else {
      console.log('Le mot de passe fourni via SARI_ADMIN_RESET_PASSWORD a été appliqué.');
    }
    console.log(`Coffre mis à jour : ${path.relative(root, result.file)}`);
    console.log('Vérification locale du nouveau mot de passe : OK');
    console.log('Le serveur recharge automatiquement le coffre à la prochaine connexion. Un redémarrage reste recommandé.\n');
  } catch (error) {
    console.error(`\nRéinitialisation impossible : ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { resetAdministrator };

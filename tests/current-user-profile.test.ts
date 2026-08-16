import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const source=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');

describe('current-user profile and password menu',()=>{
  it('exposes the two profile dropdown actions in the top bar',()=>{const html=source('index.html'),auth=source('js/auth.js');expect(html).toContain('sari-profile-menu');expect(html).toContain('auth.openProfileView()');expect(html).toContain('auth.openPasswordUpdate()');expect(auth).toContain('toggleProfileMenu');});
  it('adds profile and password actions to the personal space',()=>{const portal=source('js/modules/portal.js');expect(portal).toContain('profileActionsHtml');expect(portal).toContain('personal-profile-actions');expect(portal).toContain('auth.openPasswordUpdate()');});
  it('changes passwords only through the authenticated server endpoint',()=>{const server=source('server.js'),auth=source('js/auth.js');expect(server).toContain("'/api/auth/change-password'");expect(server).toContain('authVault.changePassword');expect(auth).toContain("fetch('/api/auth/change-password'");});
  it('ships profile security translations in all languages',()=>{const keys=['myProfile','viewMyProfile','updatePassword','currentPassword','confirmNewPassword','passwordChanged'];for(const lang of ['fr','ar','en']){const pack=JSON.parse(source(`content/translations/${lang}.json`));for(const key of keys)expect(pack[key],`${lang}:${key}`).toBeTruthy();}});
});

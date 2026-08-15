import * as db from './db';
import * as sync from './sync';
import * as template from './template-engine';

export const SariCore = { db, sync, template } as const;

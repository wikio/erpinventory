import * as db from './db';
import * as sync from './sync';
import * as template from './template-engine';
import * as commerce from './commerce';

export const SariCore = { db, sync, template, commerce } as const;

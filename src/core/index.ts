import * as db from './db';
import * as sync from './sync';
import * as template from './template-engine';
import * as commerce from './commerce';
import * as fiscal from './fiscal';
import * as ordering from './ordering';

export const SariCore = { db, sync, template, commerce, fiscal, ordering } as const;

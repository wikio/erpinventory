import * as db from './db';
import * as sync from './sync';
import * as template from './template-engine';
import * as commerce from './commerce';
import * as fiscal from './fiscal';
import * as ordering from './ordering';
import * as payroll from './payroll';
import * as leave from './leave';

export const SariCore = { db, sync, template, commerce, fiscal, ordering, payroll, leave } as const;

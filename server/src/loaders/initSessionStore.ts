/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */

import session from 'express-session';
import { Sequelize } from 'sequelize';

declare module 'express-session' {
  interface SessionData {
    accountId: number;
  }
}

export default async function initSessionStore(
  sequelize: Sequelize,
): Promise<any> {
  const SequelizeStore = require('connect-session-sequelize')(session.Store);
  const sequelizeSessionStore = new SequelizeStore({
    db: sequelize,
  });

  await sequelizeSessionStore.sync();

  return sequelizeSessionStore;
}
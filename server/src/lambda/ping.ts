/*
 * Lambda connectivity check. Opens the MySQL pool once per process, runs
 * SELECT 1, and reads public ESI market history for Tritanium in The Forge.
 * Returns ok only when both calls succeed. recordRun stores that outcome.
 */
import 'reflect-metadata';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { THE_FORGE } from '../const/IDs';
import EsiQueryService from '../core/esi/EsiQueryService';
import { initDatabase } from '../loaders/initDatabase';
import { recordRun } from './recordRun';

const TRITANIUM = 34;

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (ready !== null) {
    return ready;
  }

  ready = initPool().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function initPool(): Promise<void> {
  initDatabase();
  await Container.get(Sequelize).authenticate();
}

export const handler = recordRun(async (): Promise<{ ok: true }> => {
  await ensureReady();
  await Container.get(Sequelize).query('SELECT 1 AS ok');
  await Container.get(EsiQueryService).genxRegionMarketHistory(THE_FORGE, TRITANIUM);
  return { ok: true };
});

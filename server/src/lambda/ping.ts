/*
 * Lambda connectivity check. Opens the MySQL pool once per container and
 * returns SELECT 1. Invoke this before any real script.
 */
import 'reflect-metadata';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { initDatabase } from '../loaders/initDatabase';

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (ready != null) {
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

export async function handler(): Promise<{ ok: unknown }> {
  await ensureReady();
  const [rows] = await Container.get(Sequelize).query('SELECT 1 AS ok');
  return { ok: rows };
}

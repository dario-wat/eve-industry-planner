/**
 * The previous open book, gzipped in S3. The next poll diffs against this
 * object instead of reading every open order back out of TiDB.
 */
import { promisify } from 'util';
import { gzip, gunzipSync } from 'zlib';
import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { OpenOrder } from './diffOrderBook';

const SNAPSHOT_VERSION = 'v1';
const TUPLE_LENGTH = 13;
const gzipAsync = promisify(gzip);

let client: S3Client | null = null;

export async function genLoadOpenOrderSnapshot(
  regionId: number,
): Promise<OpenOrder[] | null> {
  try {
    const response = await s3().send(new GetObjectCommand({
      Bucket: bucket(),
      Key: snapshotKey(regionId),
    }));
    if (response.Body === undefined) {
      throw new Error(`Order book snapshot for region ${regionId} was empty`);
    }
    const zipped = Buffer.from(await response.Body.transformToByteArray());
    return parseSnapshot(regionId, gunzipSync(zipped).toString('utf8'));
  } catch (error) {
    if (isMissingSnapshot(error)) {
      return null;
    }
    throw error;
  }
}

export async function genSaveOpenOrderSnapshot(
  regionId: number,
  orders: readonly OpenOrder[],
): Promise<void> {
  const body = await gzipLines(snapshotLines(orders));
  assertCompleteGzip(body.gzipped, body.plainBytes);
  await s3().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: snapshotKey(regionId),
    Body: body.gzipped,
    ContentType: 'application/gzip',
  }));
}

function snapshotKey(regionId: number): string {
  return `order-book/region-${regionId}.json.gz`;
}

function bucket(): string {
  const name = process.env.ORDER_BOOK_BUCKET;
  if (name === undefined || name.trim().length === 0) {
    throw new Error('ORDER_BOOK_BUCKET is not set');
  }
  return name;
}

function s3(): S3Client {
  if (client === null) {
    client = new S3Client({
      region: process.env.AWS_REGION
        ?? process.env.AWS_DEFAULT_REGION
        ?? 'us-west-2',
    });
  }
  return client;
}

function isMissingSnapshot(error: unknown): boolean {
  if (error instanceof NoSuchKey) {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false;
  }
  const name = (error as { name?: string }).name;
  return name === 'NoSuchKey' || name === 'NotFound';
}

function* snapshotLines(orders: readonly OpenOrder[]): Generator<string> {
  yield `${SNAPSHOT_VERSION}\n`;
  for (const order of orders) {
    yield `${JSON.stringify(toTuple(order))}\n`;
  }
}

/**
 * zlib.gzip() emits one complete member. The old stream collector waited
 * on 'finish' and sometimes uploaded the bytes it had before the tail
 * arrived. A short gzip then fails every later read, before a new one
 * can be saved.
 */
async function gzipLines(
  lines: Iterable<string>,
): Promise<{ gzipped: Buffer; plainBytes: number }> {
  const parts: Buffer[] = [];
  let plainBytes = 0;
  for (const line of lines) {
    const part = Buffer.from(line);
    parts.push(part);
    plainBytes += part.length;
  }
  return {
    gzipped: await gzipAsync(Buffer.concat(parts)),
    plainBytes,
  };
}

function assertCompleteGzip(body: Buffer, plainBytes: number): void {
  if (body.length < 18 || body[0] !== 0x1f || body[1] !== 0x8b) {
    throw new Error('Order book snapshot gzip is incomplete');
  }
  const isize = body.readUInt32LE(body.length - 4);
  if (isize !== (plainBytes >>> 0)) {
    throw new Error('Order book snapshot gzip is incomplete');
  }
}

function parseSnapshot(regionId: number, text: string): OpenOrder[] {
  const lines = text.split('\n').filter((line) => line.length > 0);
  if (lines.length === 0 || lines[0] !== SNAPSHOT_VERSION) {
    throw new Error(`Order book snapshot for region ${regionId} is not ${SNAPSHOT_VERSION}`);
  }
  const orders: OpenOrder[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    orders.push(fromTuple(JSON.parse(lines[i]) as unknown));
  }
  return orders;
}

function toTuple(order: OpenOrder): unknown[] {
  return [
    order.orderId,
    order.typeId,
    order.locationId,
    order.systemId,
    order.isBuy ? 1 : 0,
    order.price,
    order.volumeRemain,
    order.volumeTotal,
    order.minVolume,
    order.range,
    order.issued,
    order.duration,
    order.missing ? 1 : 0,
  ];
}

function fromTuple(value: unknown): OpenOrder {
  if (!Array.isArray(value) || value.length !== TUPLE_LENGTH) {
    throw new Error('Order book snapshot row is invalid');
  }
  const [
    orderId,
    typeId,
    locationId,
    systemId,
    isBuy,
    price,
    volumeRemain,
    volumeTotal,
    minVolume,
    range,
    issued,
    duration,
    missing,
  ] = value as unknown[];
  if (
    typeof orderId !== 'number'
    || typeof typeId !== 'number'
    || typeof locationId !== 'number'
    || typeof systemId !== 'number'
    || (isBuy !== 0 && isBuy !== 1)
    || typeof price !== 'number'
    || typeof volumeRemain !== 'number'
    || typeof volumeTotal !== 'number'
    || typeof minVolume !== 'number'
    || typeof range !== 'string'
    || typeof issued !== 'string'
    || typeof duration !== 'number'
    || (missing !== 0 && missing !== 1)
  ) {
    throw new Error('Order book snapshot row is invalid');
  }
  return {
    orderId,
    typeId,
    locationId,
    systemId,
    isBuy: isBuy === 1,
    price,
    volumeRemain,
    volumeTotal,
    minVolume,
    range,
    issued,
    duration,
    missing: missing === 1,
  };
}

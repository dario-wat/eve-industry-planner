import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shortLocationName } from './locationNames';

test('NPC stations become system and planet-moon', () => {
  assert.equal(
    shortLocationName('Jita IV - Moon 4 - Caldari Navy Assembly Plant', true),
    'Jita 4-4',
  );
  assert.equal(
    shortLocationName('Jita VII - Moon 18 - Freedom Extension Storage', true),
    'Jita 7-18',
  );
  assert.equal(
    shortLocationName('New Caldari IX - School of Applied Knowledge', true),
    'New Caldari 9',
  );
});

test('structures use the nickname, else the name without the system prefix', () => {
  assert.equal(
    shortLocationName('Perimeter - Tranquility Trading Tower', false, 'TTT'),
    'Perimeter TTT',
  );
  assert.equal(shortLocationName('Perimeter - Some Keepstar', false), 'Perimeter Some Keepstar');
  assert.equal(shortLocationName('No separator', false), 'No separator');
});

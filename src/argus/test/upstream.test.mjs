import test from 'node:test';
import assert from 'node:assert/strict';
import { contract, supportedNode } from '../runtime/upstream.mjs';

test('supportedNode accepts exactly the contract minimum Node and newer', () => {
  assert.equal(contract.minimumNode, '22.18.0');
  assert.equal(supportedNode('22.18.0'), true);
  assert.equal(supportedNode('22.18.1'), true);
  assert.equal(supportedNode('22.19.0'), true);
  assert.equal(supportedNode('23.0.0'), true);
  assert.equal(supportedNode('24.1.0'), true);
  assert.equal(supportedNode('22.17.9'), false);
  assert.equal(supportedNode('22.0.99'), false);
  assert.equal(supportedNode('21.99.0'), false);
  assert.equal(supportedNode('18.20.4'), false);
});

import { evaluationGate } from './eval-gate.mjs';
const gate = await evaluationGate();
process.stdout.write(JSON.stringify({ schemaVersion: 2, ...gate }, null, 2) + '\n');
if (!gate.releaseReady) process.exitCode = 1;

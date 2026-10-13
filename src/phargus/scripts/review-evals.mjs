import { parseArgs } from 'node:util';
import { behaviorFingerprint } from './eval-gate.mjs';
import { readReport, signOff, writeReport } from './verification.mjs';

// The human reviewer's sign-off on one trial, after reading its transcript under evals/results/
// and its committed evidence against the rubric in evals/README.md.
const { values } = parseArgs({
  options: {
    run: { type: 'string' },
    case: { type: 'string' },
    client: { type: 'string' },
    reviewer: { type: 'string' },
    accept: { type: 'boolean', default: false },
    reject: { type: 'boolean', default: false },
    note: { type: 'string' },
  },
});
if (!values.run || !values.case || !values.client || !values.reviewer)
  throw new Error('--run, --case, --client and --reviewer (your GitHub handle) are required');
if (values.accept === values.reject) throw new Error('pass exactly one of --accept or --reject');
const report = await readReport();
const trial = await signOff(report, {
  run: values.run,
  client: values.client,
  case: values.case,
  reviewer: values.reviewer,
  decision: values.accept ? 'passed' : 'rejected',
  note: values.note,
  fingerprint: await behaviorFingerprint(),
});
await writeReport(report);
process.stdout.write(JSON.stringify(trial, null, 2) + '\n');

import { createFileReplayLedger } from "./file-replay-ledger.mjs";

const [directory, operationId] = process.argv.slice(2);
const decision = createFileReplayLedger({ directory }).claim(operationId);
process.stdout.write(`${JSON.stringify(decision)}\n`);

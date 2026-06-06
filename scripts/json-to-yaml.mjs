#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { stringify } from 'yaml';

const input = process.argv[2] ?? 'spec/openapi.json';
const output = process.argv[3] ?? 'spec/swagger.yaml';

const spec = JSON.parse(readFileSync(input, 'utf8'));
writeFileSync(output, stringify(spec, { lineWidth: 0 }));
console.log(`Wrote ${output}`);

const fs = require('node:fs');
// The model generator owns index.ts; append the path types after each generation.
fs.appendFileSync('src/index.ts', "\nexport type { paths, components, operations } from './service-nestjs-assessment-test.types';\n");

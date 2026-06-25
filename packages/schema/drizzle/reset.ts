import { resetDatabase } from './helpers';

void resetDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });

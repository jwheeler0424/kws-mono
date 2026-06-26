import { logger } from '@/lib/logger';

logger.info("Hello, MLS Grid Application!");

process.on("SIGINT", () => {
  logger.info("Ctrl-C was pressed");
  process.exit();
});
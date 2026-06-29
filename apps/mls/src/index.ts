import { main } from '@/app';
import { logger } from '@/lib/logger';

main().catch((error) => {
  logger.error("An error occurred while running the MLS Grid Application:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  logger.info("Ctrl-C was pressed");
  process.exit();
});

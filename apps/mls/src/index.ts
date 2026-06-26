import { main } from '@/app';
import { logger } from '@/lib/logger';

main().catch((error) => {
  console.error("An error occurred while running the MLS Grid Application:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  logger.info("Ctrl-C was pressed");
  process.exit();
});

/**
 * const RUN_GUARD_KEY = Symbol.for('kws.mls.seed.runPromise')
const SIGNAL_GUARD_KEY = Symbol.for('kws.mls.seed.signalHandlerRegistered')

type MlsGlobalState = typeof globalThis & {
  [RUN_GUARD_KEY]?: Promise<void>
  [SIGNAL_GUARD_KEY]?: boolean
}

const mlsGlobal = globalThis as MlsGlobalState

if (!mlsGlobal[RUN_GUARD_KEY]) {
  mlsGlobal[RUN_GUARD_KEY] = main()
    .catch((error) => {
      console.error('An error occurred while running the MLS Grid Application:', error)
      process.exit(1)
    })
    .finally(() => {
      mlsGlobal[RUN_GUARD_KEY] = undefined
    })
} else {
  logger.warn('MLS seed already running; skipping duplicate startup')
}

if (!mlsGlobal[SIGNAL_GUARD_KEY]) {
  process.on('SIGINT', () => {
    logger.info('Ctrl-C was pressed')
    process.exit()
  })
  mlsGlobal[SIGNAL_GUARD_KEY] = true
}
 */
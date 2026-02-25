import logger from '../shared/lib/logger.js';

/**
 * Helper to log test failures to the system logger.
 * @param {string} testName 
 * @param {Error} error 
 */
export const logTestFailure = (testName, error) => {
    logger.error(`Automated Test Failure: ${testName}`, {
        testName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        category: 'testing'
    });
};

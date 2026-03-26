/**
 * Transaction utility for PGlite services.
 * Implements the transaction control pattern once for reuse across all services.
 */

/**
 * Executes fn inside a read-write transaction.
 * Commits on success, rolls back on any error.
 * @param {import('@electric-sql/pglite').PGlite} db
 * @param {function} fn - receives db, returns a promise
 */
export async function withTransaction(db, fn) {
  await db.exec('BEGIN');
  try {
    const result = await fn(db);
    await db.exec('COMMIT');
    return result;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

/**
 * Executes fn inside a read-only transaction.
 * Commits on success, rolls back on any error.
 * @param {import('@electric-sql/pglite').PGlite} db
 * @param {function} fn - receives db, returns a promise
 */
export async function withReadTransaction(db, fn) {
  await db.exec('BEGIN READ ONLY');
  try {
    const result = await fn(db);
    await db.exec('COMMIT');
    return result;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

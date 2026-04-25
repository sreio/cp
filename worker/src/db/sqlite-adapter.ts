import Database from 'better-sqlite3';
import { D1Adapter } from './d1-adapter';

class SQLiteD1Compat {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    let boundParams: unknown[] = [];

    const chain = {
      bind(...params: unknown[]) {
        boundParams = params;
        return chain;
      },
      async first<T>(): Promise<T | null> {
        try {
          const row = stmt.get(...boundParams) as T | undefined;
          return row ?? null;
        } catch {
          return null;
        }
      },
      async all<T>(): Promise<{ results: T[] }> {
        try {
          const rows = stmt.all(...boundParams) as T[];
          return { results: rows };
        } catch {
          return { results: [] };
        }
      },
      async run() {
        const info = stmt.run(...boundParams);
        return { meta: { last_row_id: info.lastInsertRowid } };
      },
    };
    return chain;
  }
}

export function createSQLiteAdapter(path: string) {
  const db = new SQLiteD1Compat(path) as unknown as D1Database;
  return new D1Adapter(db);
}

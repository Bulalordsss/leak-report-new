import * as SQLite from 'expo-sqlite';

export type Customer = {
  meterNumber: string;
  accountNumber: string;
  address: string;
  dma: string;
  latitude: number;
  longitude: number;
};

const DB_NAME = 'customerdata.db';

// Singleton database instance and initialization promise
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Simple initialization - just open the database
async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  console.log('[CustomerDB] Opening database...');
  
  // Open the database
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Create tables - use a single exec call to minimize lock time
  console.log('[CustomerDB] Creating tables...');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meterNumber TEXT,
      accountNumber TEXT,
      address TEXT,
      dma TEXT,
      latitude REAL,
      longitude REAL
    );
    CREATE INDEX IF NOT EXISTS idx_meter ON customers(meterNumber);
    CREATE INDEX IF NOT EXISTS idx_account ON customers(accountNumber);
  `);
  
  console.log('[CustomerDB] Database initialized successfully');
  dbInstance = db;
  return db;
}

// Get or initialize the database - ensures only one initialization happens
function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initialized, return the instance
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  
  // If initialization is in progress, return the existing promise
  if (initPromise) {
    console.log('[CustomerDB] Waiting for existing initialization...');
    return initPromise;
  }
  
  // Start initialization - set the promise IMMEDIATELY (synchronously) to prevent race conditions
  console.log('[CustomerDB] Starting database initialization...');
  initPromise = initDatabase();
  
  // Handle errors to allow retry on next call
  initPromise.catch(error => {
    console.error('[CustomerDB] Initialization failed:', error?.message);
    initPromise = null;
    dbInstance = null;
  });
  
  return initPromise;
}

/** 
 * Initialize the database explicitly.
 * Call this before starting operations that need the database to be ready.
 */
export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}

/** Save all customer data to SQLite (clears existing data first) */
export async function saveCustomerData(customers: Customer[]): Promise<void> {
  const db = await getDatabase();
  
  // Clear existing data using runAsync (handles locks better)
  await db.runAsync('DELETE FROM customers');
  
  // Use bulk insert for much faster performance
  await _saveBatchInternal(db, customers);
}

/** Internal function to save batch */
async function _saveBatchInternal(db: SQLite.SQLiteDatabase, customers: Customer[]): Promise<void> {
  if (customers.length === 0) return;
  
  // Use a single transaction with bulk VALUES for much faster inserts
  // SQLite supports up to ~500 variables per statement, so we batch accordingly
  // 6 columns per row = max ~80 rows per statement to be safe
  const ROWS_PER_STATEMENT = 50;
  
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < customers.length; i += ROWS_PER_STATEMENT) {
      const batch = customers.slice(i, i + ROWS_PER_STATEMENT);
      
      // Build a bulk INSERT statement with multiple VALUES
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values: (string | number)[] = [];
      
      for (const c of batch) {
        values.push(c.meterNumber, c.accountNumber, c.address, c.dma, c.latitude, c.longitude);
      }
      
      await db.runAsync(
        `INSERT INTO customers (meterNumber, accountNumber, address, dma, latitude, longitude) VALUES ${placeholders}`,
        values
      );
    }
  });
}

/** 
 * Save a batch of customers using bulk INSERT for fast performance.
 * @param customers - Array of customers to save
 * @param append - If true, appends to existing data. If false, doesn't clear (caller should clear first if needed)
 */
export async function saveBatchCustomerData(customers: Customer[], append: boolean = true): Promise<void> {
  const db = await getDatabase();
  await _saveBatchInternal(db, customers);
}

/** Prepare for batch import by clearing existing data */
export async function clearForBatchImport(): Promise<void> {
  // Add retry logic for database lock issues
  const maxRetries = 5;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = await getDatabase();
      console.log(`[CustomerDB] Clearing data (attempt ${attempt})...`);
      
      // Use runAsync instead of execAsync - it handles locks better
      await db.runAsync('DELETE FROM customers');
      
      console.log('[CustomerDB] Data cleared successfully');
      return;
    } catch (error: any) {
      lastError = error;
      console.log(`[CustomerDB] Clear attempt ${attempt} failed:`, error?.message);
      
      if (attempt < maxRetries) {
        // Wait longer before retrying
        const delay = attempt * 2000; // 2s, 4s, 6s, 8s
        console.log(`[CustomerDB] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/** Load all customer data from SQLite */
export async function loadCustomerData(): Promise<Customer[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync<Customer>('SELECT meterNumber, accountNumber, address, dma, latitude, longitude FROM customers');
    return result;
  } catch {
    return [];
  }
}

/** Clear all customer data from SQLite */
export async function clearCustomerData(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM customers');
}

/** Check if customer data exists */
export async function hasCustomerData(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Get count of customer records */
export async function getCustomerCount(): Promise<number> {
  try {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Search customers by meter number or account number */
export async function searchCustomers(query: string, limit = 50): Promise<Customer[]> {
  try {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<Customer>(
      `SELECT meterNumber, accountNumber, address, dma, latitude, longitude 
       FROM customers 
       WHERE meterNumber LIKE ? OR accountNumber LIKE ? OR address LIKE ?
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, limit]
    );
    return result;
  } catch {
    return [];
  }
}

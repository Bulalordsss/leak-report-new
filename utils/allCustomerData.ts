import * as SQLite from 'expo-sqlite';
import { InteractionManager } from 'react-native';
import { decryptName, isEncrypted } from '@/services/customerInterceptor';

export type Customer = {
  meterNumber: string;
  accountNumber: string;
  address: string;
  dma: string;
  latitude: number;
  longitude: number;
  name?: string;
  wss?: string;
  connectionClass?: string;
  status?: string;
};

const DB_NAME = 'customerdata.db';

// Singleton database instance and initialization promise
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Simple initialization - just open the database
async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  console.log('[CustomerDB] Starting database initialization...');
  
  // Defer to allow UI to render first
  await new Promise(resolve => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 100);
    });
  });
  
  console.log('[CustomerDB] Opening database...');
  
  // Open the database
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Check if table exists and has the new columns
  console.log('[CustomerDB] Checking table schema...');
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(customers)"
    );
    const columnNames = tableInfo.map(col => col.name);
    
    // Check if new columns exist
    const hasNewColumns = columnNames.includes('name') && 
                          columnNames.includes('wss') && 
                          columnNames.includes('connectionClass') && 
                          columnNames.includes('status');
    
    if (tableInfo.length > 0 && !hasNewColumns) {
      // Table exists but with old schema - drop and recreate
      console.log('[CustomerDB] Old schema detected, recreating table...');
      await db.execAsync(`
        DROP TABLE IF EXISTS customers;
        DROP INDEX IF EXISTS idx_meter;
        DROP INDEX IF EXISTS idx_account;
      `);
    }
  } catch (e) {
    // Table might not exist yet, which is fine
    console.log('[CustomerDB] Table check result:', e);
  }
  
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
      longitude REAL,
      name TEXT,
      wss TEXT,
      connectionClass TEXT,
      status TEXT
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
  // 10 columns per row = max ~50 rows per statement to be safe
  const ROWS_PER_STATEMENT = 50;
  
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < customers.length; i += ROWS_PER_STATEMENT) {
      const batch = customers.slice(i, i + ROWS_PER_STATEMENT);
      
      // Build a bulk INSERT statement with multiple VALUES
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values: (string | number)[] = [];
      
      for (const c of batch) {
        values.push(
          c.meterNumber,
          c.accountNumber,
          c.address,
          c.dma,
          c.latitude,
          c.longitude,
          c.name || '',
          c.wss || '',
          c.connectionClass || '',
          c.status || ''
        );
      }
      
      await db.runAsync(
        `INSERT INTO customers (meterNumber, accountNumber, address, dma, latitude, longitude, name, wss, connectionClass, status) VALUES ${placeholders}`,
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

/**
 * Stream customer data from an async generator and save to SQLite simultaneously.
 * This allows fetching and saving to happen in parallel for better performance.
 * @param dataGenerator - Async generator that yields batches of customers
 * @param onProgress - Optional callback for progress updates
 * @returns Total number of customers saved
 */
export async function streamAndSaveCustomerData(
  dataGenerator: AsyncGenerator<Customer[], void, unknown>,
  onProgress?: (saved: number, total: number) => void
): Promise<number> {
  const db = await getDatabase();
  let totalSaved = 0;
  let estimatedTotal = 0;
  
  console.log('[CustomerDB] Starting stream and save...');
  
  // Clear existing data first
  await clearForBatchImport();
  
  for await (const batch of dataGenerator) {
    if (batch.length === 0) continue;
    
    // Save this batch to SQLite
    await _saveBatchInternal(db, batch);
    totalSaved += batch.length;
    
    // Update progress
    onProgress?.(totalSaved, estimatedTotal);
    console.log(`[CustomerDB] Saved batch of ${batch.length}. Total: ${totalSaved}`);
  }
  
  console.log(`[CustomerDB] Stream complete. Total saved: ${totalSaved}`);
  return totalSaved;
}

/**
 * Stream customer data with known total count for accurate progress reporting.
 * @param dataGenerator - Async generator that yields batches of customers  
 * @param totalCount - Known total count for progress calculation
 * @param onProgress - Optional callback for progress updates
 * @returns Total number of customers saved
 */
export async function streamAndSaveCustomerDataWithTotal(
  dataGenerator: AsyncGenerator<Customer[], void, unknown>,
  totalCount: number,
  onProgress?: (saved: number, total: number) => void
): Promise<number> {
  const db = await getDatabase();
  let totalSaved = 0;
  
  console.log(`[CustomerDB] Starting stream and save. Expected total: ${totalCount}`);
  
  // Clear existing data first
  await clearForBatchImport();
  
  for await (const batch of dataGenerator) {
    if (batch.length === 0) continue;
    
    // Save this batch to SQLite
    await _saveBatchInternal(db, batch);
    totalSaved += batch.length;
    
    // Update progress with known total
    onProgress?.(totalSaved, totalCount);
    console.log(`[CustomerDB] Saved batch of ${batch.length}. Total: ${totalSaved}/${totalCount}`);
  }
  
  console.log(`[CustomerDB] Stream complete. Total saved: ${totalSaved}`);
  return totalSaved;
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

/** Decrypt the name field of a customer row if it's encrypted */
function decryptCustomer(c: Customer): Customer {
  if (c.name && isEncrypted(c.name)) {
    return { ...c, name: decryptName(c.name) };
  }
  return c;
}

/** Load all customer data from SQLite (decrypts names) */
export async function loadCustomerData(): Promise<Customer[]> {
  try {
    const db = await getDatabase();
    const result = await db.getAllAsync<Customer>('SELECT meterNumber, accountNumber, address, dma, latitude, longitude, name, wss, connectionClass, status FROM customers');
    return result.map(decryptCustomer);
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

/** Search customers by meter number or account number (decrypts names in results) */
export async function searchCustomers(query: string, limit = 50): Promise<Customer[]> {
  try {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<Customer>(
      `SELECT meterNumber, accountNumber, address, dma, latitude, longitude, name, wss, connectionClass, status 
       FROM customers 
       WHERE meterNumber LIKE ? OR accountNumber LIKE ? OR address LIKE ?
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, limit]
    );
    return result.map(decryptCustomer);
  } catch {
    return [];
  }
}

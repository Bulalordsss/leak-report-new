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

// Singleton database instance
let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

// Open database (async in expo-sqlite v14+) - returns singleton instance
async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  
  // Initialize tables if not done yet
  if (!isInitialized) {
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meterNumber TEXT,
        accountNumber TEXT,
        address TEXT,
        dma TEXT,
        latitude REAL,
        longitude REAL
      );
    `);
    await dbInstance.execAsync(`CREATE INDEX IF NOT EXISTS idx_meter ON customers(meterNumber);`);
    await dbInstance.execAsync(`CREATE INDEX IF NOT EXISTS idx_account ON customers(accountNumber);`);
    isInitialized = true;
  }
  
  return dbInstance;
}

/** Save all customer data to SQLite (clears existing data first) */
export async function saveCustomerData(customers: Customer[]): Promise<void> {
  const db = await getDatabase();
  
  // Clear existing data
  await db.execAsync('DELETE FROM customers');
  
  // Insert in smaller batches to avoid memory issues on Android
  const batchSize = 100; // Reduced batch size for stability
  
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    
    // Use transaction for each batch
    await db.withTransactionAsync(async () => {
      for (const c of batch) {
        await db.runAsync(
          `INSERT INTO customers (meterNumber, accountNumber, address, dma, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)`,
          [c.meterNumber, c.accountNumber, c.address, c.dma, c.latitude, c.longitude]
        );
      }
    });
    
    console.log(`Saved batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(customers.length / batchSize)}`);
  }
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
  await db.execAsync('DELETE FROM customers');
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

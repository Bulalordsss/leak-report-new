import { File, Paths, Directory } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { saveBatchCustomerData, loadCustomerData, Customer, clearForBatchImport, initializeDatabase } from '@/utils/allCustomerData';

export type FetchCustomerDataResult = {
  success: boolean;
  count: number;
  error?: string;
};

const REMOTE_DB_URL = 'https://www.davao-water.gov.ph/dcwdApps/mobileApps/mobilegis/offlinedb/gis.s3db';
const DOWNLOADED_DB_NAME = 'gis_remote.db';

/**
 * Download the remote SQLite database and extract customer data from it.
 */
export async function fetchAndSaveCustomerData(
  onProgress?: (current: number, total: number) => void
): Promise<FetchCustomerDataResult> {
  let remoteDb: SQLite.SQLiteDatabase | null = null;
  let targetFile: File | null = null;
  
  try {
    // Pre-initialize the local database to ensure it's ready
    console.log('Pre-initializing local database...');
    await initializeDatabase();
    console.log('Local database ready.');
    
    console.log('Downloading remote database...');
    onProgress?.(0, 100);

    // expo-sqlite stores databases in documentDirectory/SQLite/
    // We need to download the file there for it to be opened properly
    const sqliteDir = new Directory(Paths.document, 'SQLite');
    
    // Create SQLite directory if it doesn't exist
    if (!sqliteDir.exists) {
      console.log('Creating SQLite directory...');
      await sqliteDir.create();
    }
    
    targetFile = new File(sqliteDir, DOWNLOADED_DB_NAME);
    console.log('Target path:', targetFile.uri);
    
    // Delete existing file if it exists
    if (targetFile.exists) {
      console.log('Deleting existing file...');
      await targetFile.delete();
    }
    
    // Download directly to the SQLite directory
    console.log('Downloading from:', REMOTE_DB_URL);
    await File.downloadFileAsync(REMOTE_DB_URL, targetFile);

    // Check if file exists and has content
    if (!targetFile.exists) {
      throw new Error('Failed to download database file.');
    }
    
    console.log('File downloaded. Size:', targetFile.size, 'bytes');
    
    if (targetFile.size < 1000) {
      throw new Error(`Downloaded file is too small (${targetFile.size} bytes). The database may be empty or the download failed.`);
    }

    console.log('Database downloaded successfully. Opening database...');
    onProgress?.(30, 100);

    // Open the downloaded database using expo-sqlite
    remoteDb = await SQLite.openDatabaseAsync(DOWNLOADED_DB_NAME);

    // Query all objects in the database (tables, views, etc.)
    const allObjects = await remoteDb.getAllAsync<{ type: string; name: string; tbl_name: string }>(
      "SELECT type, name, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'"
    );
    console.log('All objects in database:', JSON.stringify(allObjects, null, 2));

    // Get tables specifically
    const tables = await remoteDb.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    console.log('Tables in downloaded database:', tables.map(t => t.name));

    // If no tables found, check if it's an encrypted database or different format
    if (tables.length === 0) {
      // Try to get database info
      const pragmaInfo = await remoteDb.getAllAsync<Record<string, any>>('PRAGMA database_list');
      console.log('Database list:', pragmaInfo);
      
      // Try integrity check
      try {
        const integrityCheck = await remoteDb.getAllAsync<{ integrity_check: string }>('PRAGMA integrity_check');
        console.log('Integrity check:', integrityCheck);
      } catch (e) {
        console.log('Integrity check failed:', e);
      }
    }

    onProgress?.(40, 100);

    // Try to find and extract meter/customer data
    // Adjust the table name and column names based on actual database schema
    let customers: Customer[] = [];

    // Try common table names
    const possibleTables = ['tblmeter', 'meters', 'customer', 'customers', 'tblcustomer', 'accounts'];
    let foundTable = '';

    for (const tableName of possibleTables) {
      const tableExists = tables.some(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (tableExists) {
        foundTable = tables.find(t => t.name.toLowerCase() === tableName.toLowerCase())?.name || '';
        break;
      }
    }

    if (!foundTable) {
      // If no common table found, try to find any table with relevant columns
      console.log('No common table found, checking all tables for meter data...');
      for (const table of tables) {
        try {
          const columns = await remoteDb.getAllAsync<{ name: string }>(
            `PRAGMA table_info(${table.name})`
          );
          const columnNames = columns.map(c => c.name.toLowerCase());
          
          // Check if table has meter-related columns
          if (columnNames.some(col => col.includes('meter') || col.includes('account') || col.includes('latitude'))) {
            foundTable = table.name;
            console.log(`Found potential table: ${foundTable}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (foundTable) {
      console.log(`Extracting data from table: ${foundTable}`);
      
      // Get column info for the table
      const columns = await remoteDb.getAllAsync<{ name: string; type: string }>(
        `PRAGMA table_info(${foundTable})`
      );
      console.log('Columns:', columns.map(c => c.name));

      onProgress?.(50, 100);

      // Get total count first
      const countResult = await remoteDb.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${foundTable}`
      );
      const totalCount = countResult?.count ?? 0;
      console.log(`Total records in table: ${totalCount}`);

      // Read ALL data from remote database first, then close it before writing to local DB
      // This avoids "database is locked" issues from having two DBs open simultaneously
      console.log('Reading all data from remote database...');
      
      const BATCH_SIZE = 10000;
      let offset = 0;
      const allBatches: Customer[][] = [];
      
      while (offset < totalCount) {
        console.log(`Reading batch: ${offset} - ${offset + BATCH_SIZE} of ${totalCount}`);
        
        // Only select the columns we need to reduce memory usage
        const rawData = await remoteDb.getAllAsync<Record<string, any>>(
          `SELECT MeterNumbe, accountnumber, Address, dma, Zone, Latitude, Longitude 
           FROM ${foundTable} LIMIT ${BATCH_SIZE} OFFSET ${offset}`
        );

        // Map the data to our Customer format
        const batchCustomers: Customer[] = rawData
          .map(row => {
            const meterNumber = row.MeterNumbe || '';
            const accountNumber = row.accountnumber || '';
            const address = row.Address || '';
            const dma = row.dma || row.Zone || '';
            const latitude = parseFloat(row.Latitude || 0) || 0;
            const longitude = parseFloat(row.Longitude || 0) || 0;

            return {
              meterNumber: String(meterNumber).trim(),
              accountNumber: String(accountNumber).trim(),
              address: String(address).trim(),
              dma: String(dma).trim(),
              latitude,
              longitude,
            };
          })
          .filter(c => c.meterNumber && c.meterNumber.trim() !== '');

        if (batchCustomers.length > 0) {
          allBatches.push(batchCustomers);
        }
        
        offset += BATCH_SIZE;
        
        // Update progress (50-70% range for reading)
        const readProgress = 50 + Math.floor((offset / totalCount) * 20);
        onProgress?.(Math.min(readProgress, 70), 100);
      }

      console.log(`Read ${allBatches.length} batches from remote database`);
      
      // IMPORTANT: Close the remote database BEFORE opening local database
      console.log('Closing remote database...');
      await remoteDb.closeAsync();
      remoteDb = null;
      
      onProgress?.(75, 100);
      
      // Now write to local database
      console.log('Clearing local database...');
      await clearForBatchImport();
      
      let totalSaved = 0;
      for (let i = 0; i < allBatches.length; i++) {
        const batch = allBatches[i];
        await saveBatchCustomerData(batch, true);
        totalSaved += batch.length;
        console.log(`Saved batch ${i + 1}/${allBatches.length}. Total: ${totalSaved}`);
        
        // Update progress (75-95% range for saving)
        const saveProgress = 75 + Math.floor(((i + 1) / allBatches.length) * 20);
        onProgress?.(Math.min(saveProgress, 95), 100);
      }

      console.log(`Total valid customers saved: ${totalSaved}`);
      customers = [];
      (customers as any).savedCount = totalSaved;
    }

    onProgress?.(95, 100);

    // Close the downloaded database if not already closed
    if (remoteDb) {
      console.log('Closing remote database (cleanup)...');
      await remoteDb.closeAsync();
      remoteDb = null;
    }

    // Delete the downloaded database file to save space
    try {
      if (targetFile && targetFile.exists) {
        await targetFile.delete();
      }
    } catch (e) {
      console.log('Could not delete downloaded db file:', e);
    }

    // Get the count from our tracking (data was saved in batches)
    const savedCount = (customers as any).savedCount || 0;

    if (savedCount === 0) {
      return {
        success: false,
        count: 0,
        error: 'No customer data found in the downloaded database.',
      };
    }

    onProgress?.(100, 100);
    console.log(`Customer data import complete! Total records: ${savedCount}`);

    return { success: true, count: savedCount };
  } catch (error: any) {
    console.error('Failed to fetch customer data:', error);
    
    // Cleanup on error
    if (remoteDb) {
      try {
        await remoteDb.closeAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    return {
      success: false,
      count: 0,
      error: error?.message ?? 'Unknown error',
    };
  }
}

/**
 * Get the current download status
 */
export async function getCustomerDataStatus(): Promise<{ downloaded: boolean; count: number }> {
  const data = await loadCustomerData();
  return {
    downloaded: data.length > 0,
    count: data.length,
  };
}

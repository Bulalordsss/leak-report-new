import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { unzipSync } from 'fflate';
import { InteractionManager } from 'react-native';

const MAP_URL = 'https://davao-water.gov.ph/dcwdApps/mobileApps/reactMap/davroad.zip';

interface MapState {
  downloadProgress: number;
  isDownloading: boolean;
  isUnzipping: boolean;
  isReady: boolean;
  error: string | null;
  mapTilesPath: string | null;
  statusMessage: string;

  // Actions
  checkExistingMap: () => Promise<void>;
  initializeMap: (mapUrl?: string) => Promise<void>;
  clearMapData: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  downloadProgress: 0,
  isDownloading: false,
  isUnzipping: false,
  isReady: false,
  error: null,
  mapTilesPath: null,
  statusMessage: 'Initializing...',

  setError: (error) => set({ error }),

  checkExistingMap: async () => {
    try {
      const mapDir = `${FileSystem.documentDirectory}offline_maps/`;
      const extractedPath = `${mapDir}davroad/davroad/`;

      const dirInfo = await FileSystem.getInfoAsync(extractedPath);
      if (dirInfo.exists) {
        console.log('Found existing map on startup');
        set({
          mapTilesPath: extractedPath,
          isReady: true,
          statusMessage: 'Map ready',
        });
      }
    } catch (error) {
      console.log('No existing map found:', error);
    }
  },

  initializeMap: async (mapUrl = MAP_URL) => {
    try {
      set({
        error: null,
        isReady: false,
        statusMessage: 'Checking for existing map...',
      });

      const mapDir = `${FileSystem.documentDirectory}offline_maps/`;
      const zipPath = `${mapDir}davroad.zip`;
      const extractPath = `${mapDir}davroad/`;
      const extractedPath = `${mapDir}davroad/davroad/`;

      // Check if map already exists - delete old before re-downloading
      const dirInfo = await FileSystem.getInfoAsync(extractPath);
      if (dirInfo.exists) {
        console.log('Davao Roads map already exists, re-downloading...');
        await FileSystem.deleteAsync(extractPath, { idempotent: true });
      }

      // Create directory if it doesn't exist
      await FileSystem.makeDirectoryAsync(mapDir, { intermediates: true });

      // Use InteractionManager to defer download until UI is ready
      await new Promise(resolve => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(resolve, 100);
        });
      });

      // Phase 1: Download
      await downloadMap(mapUrl, zipPath, set);

      // Use InteractionManager again before extraction
      await new Promise(resolve => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(resolve, 100);
        });
      });

      // Phase 2: Unzip
      await unzipMap(zipPath, extractPath, set);

      // Clean up zip file
      await FileSystem.deleteAsync(zipPath, { idempotent: true });

      set({
        mapTilesPath: extractedPath,
        isReady: true,
        statusMessage: 'Map ready!',
      });
    } catch (error: any) {
      console.error('Map initialization error:', error);
      set({
        error: error.message,
        statusMessage: `Error: ${error.message}`,
        isReady: false,
        isDownloading: false,
        isUnzipping: false,
      });
    }
  },

  clearMapData: async () => {
    try {
      const mapDir = `${FileSystem.documentDirectory}offline_maps/`;
      await FileSystem.deleteAsync(mapDir, { idempotent: true });

      set({
        isDownloading: false,
        isUnzipping: false,
        isReady: false,
        mapTilesPath: null,
        downloadProgress: 0,
        statusMessage: 'Map data cleared',
        error: null,
      });

      console.log('Map data cleared successfully');
    } catch (error: any) {
      console.error('Clear data error:', error);
      set({
        error: error.message,
        isDownloading: false,
        isUnzipping: false,
      });
    }
  },
}));

// ─── Helper: Download map ────────────────────────────────────────────

async function downloadMap(
  url: string,
  destination: string,
  set: (partial: Partial<MapState>) => void,
) {
  set({ isDownloading: true, statusMessage: 'Downloading map...' });

  try {
    console.log('Starting download from:', url);

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      destination,
      {},
      (downloadProgress) => {
        const progress = Math.round(
          (downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite) *
            100,
        );

        set({
          downloadProgress: progress,
          statusMessage: `Downloading: ${progress}%`,
        });

        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] Download progress: ${progress}%`);
      },
    );

    const downloadResult = await downloadResumable.downloadAsync();

    if (!downloadResult) {
      throw new Error('Download failed - no result returned');
    }

    console.log('Download complete:', downloadResult.uri);
    set({ isDownloading: false, statusMessage: 'Download complete' });
  } catch (error: any) {
    console.error('Download error:', error);
    set({ isDownloading: false });

    // Try to clean up partial download
    try {
      await FileSystem.deleteAsync(destination, { idempotent: true });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    throw new Error(`Download failed: ${error.message}`);
  }
}

// ─── Helper: Unzip map (fflate — fast pure JS, chunked read) ───────

async function unzipMap(
  zipPath: string,
  extractPath: string,
  set: (partial: Partial<MapState>) => void,
) {
  set({ isUnzipping: true, statusMessage: 'Reading zip file...' });

  try {
    console.log('Starting fflate extraction...');
    console.log('Zip file:', zipPath);
    console.log('Extract to:', extractPath);

    await FileSystem.makeDirectoryAsync(extractPath, { intermediates: true });

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(zipPath);
    const fileSize = (fileInfo as any).size ?? 0;
    console.log('Zip file size:', fileSize, 'bytes');

    // Read in ~10MB chunks to avoid OOM, decode directly into a single buffer
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB raw bytes per chunk
    const zipBytes = new Uint8Array(fileSize);
    let written = 0;

    const startRead = Date.now();
    while (written < fileSize) {
      const readLen = Math.min(CHUNK_SIZE, fileSize - written);
      const b64Chunk = await FileSystem.readAsStringAsync(zipPath, {
        encoding: FileSystem.EncodingType.Base64,
        position: written,
        length: readLen,
      });

      // Decode base64 chunk directly into the pre-allocated buffer
      const raw = atob(b64Chunk);
      for (let i = 0; i < raw.length; i++) {
        zipBytes[written + i] = raw.charCodeAt(i);
      }
      written += raw.length;

      const pct = Math.round((written / fileSize) * 100);
      set({ statusMessage: `Reading zip: ${pct}%` });
      console.log(`Read ${pct}% (${written}/${fileSize})`);
    }
    console.log(`Zip read in ${Date.now() - startRead}ms`);

    // Decompress with fflate (much faster than JSZip)
    set({ statusMessage: 'Decompressing...' });
    const startDecompress = Date.now();
    const extracted = unzipSync(zipBytes);
    const filenames = Object.keys(extracted);
    console.log(`Decompressed ${filenames.length} entries in ${Date.now() - startDecompress}ms`);

    // Write files in large batches
    const batchSize = 150;
    let processed = 0;
    const createdDirs = new Set<string>();

    for (let i = 0; i < filenames.length; i += batchSize) {
      const batch = filenames.slice(i, Math.min(i + batchSize, filenames.length));

      await Promise.all(
        batch.map(async (filename) => {
          if (filename.endsWith('/')) return;

          const fileData = extracted[filename];
          if (!fileData || fileData.length === 0) return;

          const filePath = `${extractPath}${filename}`;
          const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

          if (dirPath && !createdDirs.has(dirPath)) {
            createdDirs.add(dirPath);
            await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
          }

          // Convert Uint8Array → base64 for writing
          let binary = '';
          const len = fileData.length;
          const chunkLen = 8192;
          for (let j = 0; j < len; j += chunkLen) {
            const slice = fileData.subarray(j, Math.min(j + chunkLen, len));
            binary += String.fromCharCode.apply(null, slice as unknown as number[]);
          }

          await FileSystem.writeAsStringAsync(filePath, btoa(binary), {
            encoding: FileSystem.EncodingType.Base64,
          });
        }),
      );

      processed += batch.length;
      const pct = Math.round((processed / filenames.length) * 100);
      set({ statusMessage: `Writing files: ${pct}% (${processed}/${filenames.length})` });
    }

    console.log('Extraction complete');
    set({ isUnzipping: false, statusMessage: 'Extraction complete' });
  } catch (error: any) {
    console.error('Unzip error:', error);
    set({ isUnzipping: false });
    throw new Error(`Unzip failed: ${error.message}`);
  }
}

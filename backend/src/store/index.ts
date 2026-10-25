import { IStore, MemoryStore } from './memoryStore';
import { PersistentFileStore } from './persistentStore';

// Persistent file-backed storage engine for event data and administrative records
export const store: IStore = new PersistentFileStore();

export * from './memoryStore';
export * from './persistentStore';


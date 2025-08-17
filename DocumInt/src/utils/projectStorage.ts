// Utility for persisting and restoring DocumInt project state (PDF files + metadata + chat history)
// Uses IndexedDB for binary PDF storage and localStorage for fast listing/index.

export interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  message: string;
  timestamp: string; // stored as ISO string
  results?: any[];
}

export interface ProjectInsightPersist {
  id: string;
  task: string; // now stores the selection text / task only
  accentColor?: string;
  analysis?: any; // GeminiAnalysisResponse serialized
  createdAt: string;
}

export interface ProjectMetadata {
  name: string;
  pdfFileNames: string[];
  updatedAt: string; // ISO
  chatHistory?: ChatMessage[];
  insights?: ProjectInsightPersist[];
}

export interface LoadedProject extends ProjectMetadata {
  pdfFiles: File[];
}

const DB_NAME = 'DocumIntProjects';
const DB_VERSION = 1;
const FILE_STORE = 'files';
const PROJECT_STORE = 'projects';
const PROJECT_INDEX_KEY = 'documint_projects_index'; // localStorage index of project names for quick listing fallback

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        const fileStore = db.createObjectStore(FILE_STORE, { keyPath: 'id' });
        fileStore.createIndex('by_project', 'projectName', { unique: false });
      }
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(request.error?.message || 'IndexedDB open error'));
  });
}

async function fileExists(db: IDBDatabase, projectName: string, fileName: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(FILE_STORE, 'readonly');
    const store = tx.objectStore(FILE_STORE);
    const getReq = store.get(`${projectName}|${fileName}`);
    getReq.onsuccess = () => resolve(!!getReq.result);
    getReq.onerror = () => resolve(false);
  });
}

export async function saveProjectState(projectName: string, opts: { pdfFiles: File[]; chatHistory: ChatMessage[]; insights?: ProjectInsightPersist[] }): Promise<void> {
  const { pdfFiles, chatHistory, insights } = opts;
  const db = await openDB();
  // Load existing metadata to preserve insights if not provided
  let existingMeta: ProjectMetadata | undefined;
  try {
    const tx = db.transaction(PROJECT_STORE, 'readonly');
    existingMeta = await new Promise<ProjectMetadata | undefined>((resolve) => {
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.get(projectName);
      req.onsuccess = () => resolve(req.result as ProjectMetadata | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {}

  // Store/append files (avoid rewriting existing ones)
  await Promise.all(
    pdfFiles.map(async (file) => {
      const exists = await fileExists(db, projectName, file.name);
      if (exists) return;
      const arrayBuffer = await file.arrayBuffer();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(FILE_STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(tx.error?.message || 'File save transaction error'));
        const store = tx.objectStore(FILE_STORE);
        store.put({
          id: `${projectName}|${file.name}`,
          projectName,
          fileName: file.name,
          fileType: file.type,
          size: file.size,
          lastModified: file.lastModified,
          data: arrayBuffer,
        });
      });
    })
  );

  // Save project metadata in PROJECT_STORE
  const normalizedChat = chatHistory.map(m => {
    let ts: string;
    const anyM: any = m as any;
    if (anyM.timestamp instanceof Date) ts = anyM.timestamp.toISOString();
    else if (typeof m.timestamp === 'string') ts = m.timestamp;
    else ts = new Date().toISOString();
    return { ...m, timestamp: ts };
  });
  const metadata: ProjectMetadata = {
    name: projectName,
    pdfFileNames: pdfFiles.map(f => f.name),
    updatedAt: new Date().toISOString(),
    chatHistory: normalizedChat,
    insights: insights ?? existingMeta?.insights
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message || 'Metadata save transaction error'));
    tx.objectStore(PROJECT_STORE).put(metadata);
  });

  // Maintain lightweight index in localStorage for quick listing
  try {
    const index: ProjectMetadata[] = JSON.parse(localStorage.getItem(PROJECT_INDEX_KEY) || '[]');
    const existingIdx = index.findIndex(p => p.name === projectName);
    if (existingIdx >= 0) index[existingIdx] = metadata; else index.push(metadata);
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('Unable to update project index', e);
  }
}

export async function loadProject(projectName: string): Promise<LoadedProject | null> {
  const db = await openDB();
  // Load metadata
  const metadata: ProjectMetadata | undefined = await new Promise((resolve) => {
    const tx = db.transaction(PROJECT_STORE, 'readonly');
    const store = tx.objectStore(PROJECT_STORE);
    const req = store.get(projectName);
    req.onsuccess = () => resolve(req.result as ProjectMetadata | undefined);
    req.onerror = () => resolve(undefined);
  });
  if (!metadata) return null;

  // Load file blobs
  const files: File[] = await Promise.all(
    metadata.pdfFileNames.map(fileName => new Promise<File>((resolve) => {
      const tx = db.transaction(FILE_STORE, 'readonly');
      const store = tx.objectStore(FILE_STORE);
      const req = store.get(`${projectName}|${fileName}`);
      req.onsuccess = () => {
        const record = req.result;
        if (record) {
          const blob = new Blob([record.data], { type: record.fileType });
            // Reconstruct File (File constructor supported in modern browsers)
          try {
            const file = new File([blob], record.fileName, { type: record.fileType, lastModified: record.lastModified });
            resolve(file);
          } catch {
            // Fallback just Blob cast
            // @ts-ignore
            blob.name = record.fileName;
            resolve(blob as File);
          }
        } else {
          // Missing file; create empty placeholder
          const empty = new File([new Uint8Array()], fileName, { type: 'application/pdf' });
          resolve(empty);
        }
      };
      req.onerror = () => {
        const empty = new File([new Uint8Array()], fileName, { type: 'application/pdf' });
        resolve(empty);
      };
    }))
  );

  return { ...metadata, pdfFiles: files };
}

export async function listProjects(): Promise<ProjectMetadata[]> {
  // Prefer IndexedDB store (PROJECT_STORE) for authoritative list
  try {
    const db = await openDB();
    return await new Promise<ProjectMetadata[]>((resolve) => {
      const tx = db.transaction(PROJECT_STORE, 'readonly');
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as ProjectMetadata[]);
      req.onerror = () => resolve([]);
    });
  } catch {
    // Fallback to localStorage index
    try {
      return JSON.parse(localStorage.getItem(PROJECT_INDEX_KEY) || '[]');
    } catch {
      return [];
    }
  }
}

export async function deleteProject(projectName: string): Promise<void> {
  const db = await openDB();
  // Delete metadata
  await new Promise<void>((resolve) => {
    const tx = db.transaction(PROJECT_STORE, 'readwrite');
    tx.objectStore(PROJECT_STORE).delete(projectName);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  // Delete files
  await new Promise<void>((resolve) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    const store = tx.objectStore(FILE_STORE);
    const index = store.index('by_project');
    const range = IDBKeyRange.only(projectName);
    const request = index.openCursor(range);
    request.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue = e.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => resolve();
  });
  // Update index
  try {
    const index: ProjectMetadata[] = JSON.parse(localStorage.getItem(PROJECT_INDEX_KEY) || '[]');
    const filtered = index.filter(p => p.name !== projectName);
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function updateProjectInsights(projectName: string, insights: ProjectInsightPersist[]): Promise<void> {
  const db = await openDB();
  // Load existing metadata
  const meta: ProjectMetadata | null = await new Promise((resolve) => {
    const tx = db.transaction(PROJECT_STORE, 'readonly');
    const store = tx.objectStore(PROJECT_STORE);
    const req = store.get(projectName);
    req.onsuccess = () => resolve((req.result as ProjectMetadata) || null);
    req.onerror = () => resolve(null);
  });
  if (!meta) return; // Do nothing if project not found
  const updated: ProjectMetadata = { ...meta, insights, updatedAt: new Date().toISOString() };
  await new Promise<void>((resolve) => {
    const tx = db.transaction(PROJECT_STORE, 'readwrite');
    tx.objectStore(PROJECT_STORE).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  // Update index copy
  try {
    const index: ProjectMetadata[] = JSON.parse(localStorage.getItem(PROJECT_INDEX_KEY) || '[]');
    const i = index.findIndex(p => p.name === projectName);
    if (i >= 0) {
      index[i] = updated;
      localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
    }
  } catch {}
}

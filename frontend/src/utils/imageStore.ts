// TypeScript 변경 표시: JSX가 없는 유틸/API 파일이라 .js에서 .ts로 바꾼 파일입니다.
// TypeScript 변경 표시: 기존 동작은 유지하고, 이후 함수 인자/반환 타입을 점진적으로 붙일 수 있습니다.
// 초보자 안내: 이미지처럼 큰 데이터를 브라우저 저장소에 따로 저장하고 꺼내는 도우미 파일입니다.

const DB_NAME = 'papermate-image-store';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface SharedImageRecord {
  id: string;
  dataUrl: string;
  savedAt: number;
}

const openImageDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const putSharedImage = async (imageId: string, dataUrl: string) => {
  if (!imageId || !dataUrl) return;
  const db = await openImageDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id: imageId, dataUrl, savedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const getSharedImage = async (imageId: string): Promise<string> => {
  if (!imageId) return '';
  const db = await openImageDb();
  const record = await new Promise<SharedImageRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(imageId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record?.dataUrl || '';
};

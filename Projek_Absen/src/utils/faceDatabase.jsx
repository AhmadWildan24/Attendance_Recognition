
const DB_NAME = "LecturerFaceDB";
const DB_VERSION = 1;

let dbInstance = null;

export function openFaceDatabase() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("lecturers")) {
        db.createObjectStore("lecturers", {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains("faceEmbeddings")) {
        const store = db.createObjectStore("faceEmbeddings", {
          keyPath: "id",
          autoIncrement: true,
        });

        store.createIndex("lecturerId", "lecturerId", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Menambahkan data dosen
export async function addLecturer(name, email, department) {
  const db = await openFaceDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("lecturers", "readwrite");

    const request = transaction.objectStore("lecturers").add({
      name,
      email,
      department,
      createdAt: new Date().toISOString(),
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Mengambil seluruh data dosen
export async function getLecturers() {
  const db = await openFaceDatabase();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction("lecturers", "readonly")
      .objectStore("lecturers")
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Menyimpan embedding wajah
export async function addFaceEmbedding(lecturerId, embedding) {
  const db = await openFaceDatabase();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction("faceEmbeddings", "readwrite")
      .objectStore("faceEmbeddings")
      .add({
        lecturerId: Number(lecturerId),
        embedding: Array.from(embedding),
        createdAt: new Date().toISOString(),
      });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Mengambil seluruh embedding wajah
export async function getFaceEmbeddings() {
  const db = await openFaceDatabase();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction("faceEmbeddings", "readonly")
      .objectStore("faceEmbeddings")
      .getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// IndexedDB Database Layer
const DB_NAME = 'OrthoDB';
const DB_VERSION = 3;
let db = null;

const DB = {
  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        // Patients
        if (!db.objectStoreNames.contains('patients')) {
          const ps = db.createObjectStore('patients', { keyPath: 'id' });
          ps.createIndex('name', 'name', { unique: false });
          ps.createIndex('phone', 'phone', { unique: false });
          ps.createIndex('createdAt', 'createdAt', { unique: false });
        }
        // Visits
        if (!db.objectStoreNames.contains('visits')) {
          const vs = db.createObjectStore('visits', { keyPath: 'id' });
          vs.createIndex('patientId', 'patientId', { unique: false });
          vs.createIndex('date', 'date', { unique: false });
        }
        // Counter (for patient ID generation)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        // Custom templates
        if (!db.objectStoreNames.contains('templates')) {
          const ts = db.createObjectStore('templates', { keyPath: 'id' });
          ts.createIndex('order', 'order', { unique: false });
        }
        // Recycle bin (soft-deleted patients + their visits)
        if (!db.objectStoreNames.contains('recycle_bin')) {
          const rb = db.createObjectStore('recycle_bin', { keyPath: 'id' });
          rb.createIndex('deletedAt', 'deletedAt', { unique: false });
        }
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(e.target.error);
      req.onblocked = () => {
        // Old tab has DB open — ask user to close other tabs
        console.warn('IndexedDB upgrade blocked by another tab. Close other SportsMed tabs.');
      };
    });
  },

  async generatePatientId(phone) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const base = `${y}${m}${d}-${(phone || '').replace(/\D/g, '')}`;
    // Check for collisions and append a, b, c… if needed
    const suffixes = ['', 'a', 'b', 'c', 'd', 'e'];
    for (const s of suffixes) {
      const candidate = base + s;
      const existing = await this.getPatient(candidate);
      if (!existing) return candidate;
    }
    return base + Date.now(); // fallback, should never reach here
  },

  async savePatient(patient) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');
      const req = store.put(patient);
      req.onsuccess = () => resolve(patient);
      req.onerror = e => reject(e.target.error);
    });
  },

  async getPatient(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readonly');
      const req = tx.objectStore('patients').get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  },

  async getAllPatients() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readonly');
      const req = tx.objectStore('patients').getAll();
      req.onsuccess = e => resolve(e.target.result || []);
      req.onerror = e => reject(e.target.error);
    });
  },

  async searchPatients(query) {
    const all = await this.getAllPatients();
    if (!query) return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
    const q = query.toLowerCase();
    return all
      .filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q))
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);
  },

  async getTodayPatients() {
    const all = await this.getAllPatients();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return all
      .filter(p => p.lastVisit && new Date(p.lastVisit) >= today)
      .sort((a, b) => b.lastVisit - a.lastVisit);
  },

  async saveVisit(visit) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('visits', 'readwrite');
      const store = tx.objectStore('visits');
      const req = store.put(visit);
      req.onsuccess = () => resolve(visit);
      req.onerror = e => reject(e.target.error);
    });
  },

  async getPatientVisits(patientId) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('visits', 'readonly');
      const idx = tx.objectStore('visits').index('patientId');
      const req = idx.getAll(patientId);
      req.onsuccess = e => resolve((e.target.result || []).sort((a, b) => b.date - a.date));
      req.onerror = e => reject(e.target.error);
    });
  },

  async deletePatient(id) {
    // Soft delete: move patient + visits into recycle_bin
    const patient = await this.getPatient(id);
    if (!patient) return;
    const visits = await this.getPatientVisits(id);
    const entry = { id, patient, visits, deletedAt: Date.now() };
    await new Promise((resolve, reject) => {
      const tx = db.transaction('recycle_bin', 'readwrite');
      const req = tx.objectStore('recycle_bin').put(entry);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
    // Remove from active patients
    await new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readwrite');
      tx.objectStore('patients').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
    // Remove visits
    for (const v of visits) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('visits', 'readwrite');
        tx.objectStore('visits').delete(v.id);
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
      });
    }
  },

  async getRecycleBin() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recycle_bin', 'readonly');
      const req = tx.objectStore('recycle_bin').getAll();
      req.onsuccess = e => resolve((e.target.result || []).sort((a, b) => b.deletedAt - a.deletedAt));
      req.onerror = e => reject(e.target.error);
    });
  },

  async restorePatient(id) {
    const tx1 = db.transaction('recycle_bin', 'readonly');
    const entry = await new Promise((resolve, reject) => {
      const req = tx1.objectStore('recycle_bin').get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
    if (!entry) return;
    await this.savePatient(entry.patient);
    for (const v of entry.visits) await this.saveVisit(v);
    await new Promise((resolve, reject) => {
      const tx = db.transaction('recycle_bin', 'readwrite');
      tx.objectStore('recycle_bin').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  },

  async permanentDelete(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recycle_bin', 'readwrite');
      tx.objectStore('recycle_bin').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  },

  // ── Templates ──────────────────────────────────────────────────────────────
  async getAllTemplates() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const req = tx.objectStore('templates').getAll();
      req.onsuccess = e => resolve((e.target.result || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
      req.onerror = e => reject(e.target.error);
    });
  },

  async saveTemplate(tmpl) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const req = tx.objectStore('templates').put(tmpl);
      req.onsuccess = () => resolve(tmpl);
      req.onerror = e => reject(e.target.error);
    });
  },

  async deleteTemplate(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const req = tx.objectStore('templates').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  },

  async getVisit(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('visits', 'readonly');
      const req = tx.objectStore('visits').get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }
};

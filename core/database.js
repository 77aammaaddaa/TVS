class DBManager {
    constructor(dbName = 'myDatabase', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createStores();
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (event) => {
                reject(`Database error: ${event.target.errorCode}`);
            };
        });
    }

    createStores() {
        const customerStore = this.db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        const invoiceStore = this.db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
        const installmentStore = this.db.createObjectStore('installments', { keyPath: 'id', autoIncrement: true });
        const guarantorStore = this.db.createObjectStore('guarantors', { keyPath: 'id', autoIncrement: true });

        customerStore.createIndex('name', 'name', { unique: false });
        invoiceStore.createIndex('customerId', 'customerId', { unique: false });
        installmentStore.createIndex('invoiceId', 'invoiceId', { unique: false });
        guarantorStore.createIndex('customerId', 'customerId', { unique: false });
    }

    async addCustomer(customer) {
        await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const request = store.add(customer);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(`Error adding customer: ${event.target.error}`);
        });
    }

    async getCustomer(id) {
        await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(`Error getting customer: ${event.target.error}`);
        });
    }

    async updateCustomer(customer) {
        await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const request = store.put(customer);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(`Error updating customer: ${event.target.error}`);
        });
    }

    async deleteCustomer(id) {
        await this.openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(`Error deleting customer: ${event.target.error}`);
        });
    }

    // Implement similar methods for invoices, installments, and guarantors here...
}

export default DBManager;
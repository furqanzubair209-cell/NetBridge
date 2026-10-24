/**
 * NetBridge Cryptographic File Integrity Module
 * Implements SHA-256 cryptographic verification using the native Web Crypto API (crypto.subtle).
 * Detects transmission bit errors, intentional corruption, and verifies end-to-end data integrity.
 */
class CryptoIntegrity {
    constructor() {
        this.simulationCorruptNextFile = false;
        this.auditLog = [];
    }

    /**
     * Compute SHA-256 hex digest from a Blob or ArrayBuffer using browser native SubtleCrypto
     * @param {Blob|ArrayBuffer} data
     * @returns {Promise<string>} 64-character lowercase hexadecimal hash
     */
    async computeHash(data) {
        let buffer;
        if (data instanceof Blob) {
            buffer = await data.arrayBuffer();
        } else if (data instanceof ArrayBuffer) {
            buffer = data;
        } else if (ArrayBuffer.isView(data)) {
            buffer = data.buffer;
        } else {
            throw new Error("Invalid data format for hash computation");
        }

        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Verify received file against expected hash
     * @param {File|Blob} receivedFile 
     * @param {string} expectedHash 
     * @returns {Promise<{verified: boolean, expectedHash: string, actualHash: string}>}
     */
    async verifyFile(receivedFile, expectedHash) {
        if (!expectedHash) {
            return {
                verified: false,
                expectedHash: null,
                actualHash: null,
                error: 'No hash provided by sender'
            };
        }

        let fileToHash = receivedFile;

        // If corruption simulation is active, flip bits in a copy of the buffer
        if (this.simulationCorruptNextFile) {
            console.warn("[NetBridge Lab] Intentionally corrupting 1 byte to demonstrate hash failure!");
            this.simulationCorruptNextFile = false;
            const originalBuffer = await receivedFile.arrayBuffer();
            const corruptedBytes = new Uint8Array(originalBuffer.slice(0));
            // Invert the first byte
            if (corruptedBytes.length > 0) corruptedBytes[0] ^= 0xFF;
            fileToHash = new Blob([corruptedBytes], { type: receivedFile.type });
        }

        const actualHash = await this.computeHash(fileToHash);
        const verified = (actualHash.toLowerCase() === expectedHash.toLowerCase());

        const record = {
            id: 'hash_' + Date.now(),
            fileName: receivedFile.name,
            fileSize: receivedFile.size,
            expectedHash,
            actualHash,
            verified,
            timestamp: new Date().toLocaleTimeString()
        };

        this.auditLog.unshift(record);
        if (this.auditLog.length > 50) this.auditLog.pop();

        if (window.Events) {
            Events.fire('file-integrity-verified', record);
        }

        return record;
    }

    setCorruptionSimulation(enabled) {
        this.simulationCorruptNextFile = enabled;
    }

    getAuditLog() {
        return this.auditLog;
    }
}

// Global singleton instance
window.cryptoIntegrity = new CryptoIntegrity();

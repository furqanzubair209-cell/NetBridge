/**
 * NetBridge Real-Time Transfer Telemetry & WebRTC Stats Engine
 * Provides live throughput computation, WebRTC getStats() metrics polling, and transfer history auditing.
 */
class TransferStatsEngine {
    constructor() {
        this.activeTransfers = new Map();
        this.transferHistory = [];
        this.chartHistoryLength = 40;
        this.throughputHistory = []; // { time, sendBps, recvBps }
        
        this.totalBytesSent = 0;
        this.totalBytesReceived = 0;
        this.currentSendRate = 0; // Bytes/sec
        this.currentRecvRate = 0; // Bytes/sec
        this.peakSendRate = 0;
        this.peakRecvRate = 0;

        this._lastSentSample = 0;
        this._lastRecvSample = 0;
        this._lastSampleTime = performance.now();

        // WebRTC Low-Level Telemetry
        this.rtcStats = {
            rtt: 0,
            availableOutgoingBitrate: 0,
            localCandidateType: 'unknown',
            remoteCandidateType: 'unknown',
            transportProtocol: 'unknown',
            dtlsCipher: 'unknown',
            packetsLost: 0,
            jitter: 0
        };

        // Initialize empty chart history
        for (let i = 0; i < this.chartHistoryLength; i++) {
            this.throughputHistory.push({ time: i, sendBps: 0, recvBps: 0 });
        }

        // Start 1Hz rate calculation loop
        setInterval(() => this._computeRates(), 1000);
    }

    _computeRates() {
        const now = performance.now();
        const elapsedSec = (now - this._lastSampleTime) / 1000;
        if (elapsedSec <= 0) return;

        const sentDelta = this.totalBytesSent - this._lastSentSample;
        const recvDelta = this.totalBytesReceived - this._lastRecvSample;

        this.currentSendRate = Math.max(0, Math.round(sentDelta / elapsedSec));
        this.currentRecvRate = Math.max(0, Math.round(recvDelta / elapsedSec));

        if (this.currentSendRate > this.peakSendRate) this.peakSendRate = this.currentSendRate;
        if (this.currentRecvRate > this.peakRecvRate) this.peakRecvRate = this.currentRecvRate;

        this._lastSentSample = this.totalBytesSent;
        this._lastRecvSample = this.totalBytesReceived;
        this._lastSampleTime = now;

        // Shift chart history
        this.throughputHistory.shift();
        this.throughputHistory.push({
            time: Math.floor(now / 1000),
            sendBps: this.currentSendRate,
            recvBps: this.currentRecvRate
        });

        if (window.Events) {
            Events.fire('transfer-telemetry-tick', {
                sendRate: this.currentSendRate,
                recvRate: this.currentRecvRate,
                totalSent: this.totalBytesSent,
                totalRecv: this.totalBytesReceived,
                peakSend: this.peakSendRate,
                peakRecv: this.peakRecvRate,
                rtcStats: this.rtcStats,
                activeCount: this.activeTransfers.size
            });
        }
    }

    startTransfer(id, meta = {}) {
        const transfer = {
            id: id || ('xfer_' + Date.now()),
            startTime: performance.now(),
            startTimestamp: new Date(),
            fileName: meta.fileName || 'Data Stream',
            totalBytes: meta.totalBytes || 0,
            bytesTransferred: 0,
            direction: meta.direction || 'SEND', // 'SEND' | 'RECV'
            peerId: meta.peerId || 'unknown',
            peerName: meta.peerName || 'Remote Peer',
            protocol: meta.protocol || 'WebRTC DataChannel',
            status: 'transferring',
            samples: []
        };
        this.activeTransfers.set(transfer.id, transfer);
        return transfer;
    }

    recordChunk(transferId, byteLength, isSent = true) {
        if (isSent) {
            this.totalBytesSent += byteLength;
        } else {
            this.totalBytesReceived += byteLength;
        }

        const transfer = this.activeTransfers.get(transferId);
        if (transfer) {
            transfer.bytesTransferred += byteLength;
        }
    }

    finishTransfer(transferId, success = true) {
        const transfer = this.activeTransfers.get(transferId);
        if (!transfer) return;

        const durationSec = Math.max(0.001, (performance.now() - transfer.startTime) / 1000);
        const avgSpeedBps = Math.round(transfer.bytesTransferred / durationSec);

        const record = {
            id: transfer.id,
            timestamp: transfer.startTimestamp.toLocaleTimeString(),
            fileName: transfer.fileName,
            totalBytes: transfer.totalBytes || transfer.bytesTransferred,
            direction: transfer.direction,
            peerName: transfer.peerName,
            protocol: transfer.protocol,
            durationSec: parseFloat(durationSec.toFixed(2)),
            avgSpeedBps: avgSpeedBps,
            status: success ? 'completed' : 'failed'
        };

        this.transferHistory.unshift(record);
        if (this.transferHistory.length > 50) this.transferHistory.pop();
        this.activeTransfers.delete(transferId);

        if (window.Events) {
            Events.fire('transfer-completed-logged', record);
        }
        return record;
    }

    async pollRTCStats(peerConnection) {
        if (!peerConnection || typeof peerConnection.getStats !== 'function') return null;
        try {
            const stats = await peerConnection.getStats();
            stats.forEach(report => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    if (report.currentRoundTripTime !== undefined) {
                        this.rtcStats.rtt = Math.round(report.currentRoundTripTime * 1000);
                    }
                    if (report.availableOutgoingBitrate !== undefined) {
                        this.rtcStats.availableOutgoingBitrate = Math.round(report.availableOutgoingBitrate);
                    }
                    if (report.localCandidateId) {
                        const local = stats.get(report.localCandidateId);
                        if (local) {
                            this.rtcStats.localCandidateType = `${local.candidateType || 'unknown'} (${local.protocol || 'UDP'})`;
                        }
                    }
                    if (report.remoteCandidateId) {
                        const remote = stats.get(report.remoteCandidateId);
                        if (remote) {
                            this.rtcStats.remoteCandidateType = `${remote.candidateType || 'unknown'} (${remote.protocol || 'UDP'})`;
                        }
                    }
                } else if (report.type === 'transport') {
                    if (report.dtlsCipher) this.rtcStats.dtlsCipher = report.dtlsCipher;
                }
            });
            return this.rtcStats;
        } catch (e) {
            return null;
        }
    }

    formatSpeed(bps) {
        if (!bps || bps === 0) return '0 B/s';
        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bps) / Math.log(k));
        return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Global singleton instance
window.transferStats = new TransferStatsEngine();

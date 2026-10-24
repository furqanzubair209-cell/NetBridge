/**
 * NetBridge Protocol & Packet Inspector
 * Captures, decodes, and analyzes real-time WebSocket signaling frames and WebRTC control packets.
 */
class ProtocolInspector {
    constructor() {
        this.maxEntries = 500;
        this.logs = [];
        this.listeners = [];
        this.stats = {
            totalPackets: 0,
            signalingPackets: 0,
            iceCandidates: 0,
            sdpOffers: 0,
            sdpAnswers: 0,
            dataChannelPackets: 0,
            bytesLogged: 0
        };
    }

    log(direction, transport, type, payload, meta = {}) {
        const timestamp = new Date();
        const rawJson = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        const byteSize = new Blob([rawJson]).size;

        this.stats.totalPackets++;
        this.stats.bytesLogged += byteSize;

        let category = 'signaling';
        let badgeColor = '#3b82f6'; // blue

        if (type.includes('sdp') || type.includes('offer') || type.includes('answer')) {
            category = 'sdp';
            badgeColor = '#8b5cf6'; // purple
            if (type.includes('offer')) this.stats.sdpOffers++;
            if (type.includes('answer')) this.stats.sdpAnswers++;
        } else if (type.includes('ice') || type.includes('candidate')) {
            category = 'ice';
            badgeColor = '#ec4899'; // pink
            this.stats.iceCandidates++;
        } else if (type === 'ping' || type === 'pong') {
            category = 'keepalive';
            badgeColor = '#64748b'; // slate
        } else if (['request', 'header', 'partition', 'partition-received', 'progress', 'ws-chunk', 'files-transfer-response', 'file-transfer-complete'].includes(type)) {
            category = 'transfer';
            badgeColor = '#10b981'; // green
            this.stats.dataChannelPackets++;
        } else if (['peer-joined', 'peer-left', 'peers', 'join-ip-room', 'room-secrets'].includes(type)) {
            category = 'discovery';
            badgeColor = '#f59e0b'; // amber
        } else {
            this.stats.signalingPackets++;
        }

        let parsedSDP = null;
        if (payload?.sdp?.sdp || (typeof payload === 'string' && payload.includes('v=0'))) {
            parsedSDP = this.parseSDP(payload.sdp?.sdp || payload);
        }

        const entry = {
            id: 'pkt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            time: timestamp.toLocaleTimeString() + '.' + timestamp.getMilliseconds().toString().padStart(3, '0'),
            timestamp: timestamp.getTime(),
            direction, // 'IN' | 'OUT'
            transport, // 'WebSocket' | 'WebRTC-DC' | 'Local'
            category,  // 'sdp' | 'ice' | 'discovery' | 'transfer' | 'keepalive' | 'signaling'
            type,
            badgeColor,
            summary: this._generateSummary(type, payload, meta),
            payload: payload,
            rawJson,
            byteSize,
            meta,
            parsedSDP
        };

        this.logs.unshift(entry);
        if (this.logs.length > this.maxEntries) {
            this.logs.pop();
        }

        if (window.Events) {
            Events.fire('protocol-packet-logged', entry);
        }

        return entry;
    }

    _generateSummary(type, payload, meta) {
        if (!payload) return type;
        if (type === 'signal') {
            if (payload.sdp) {
                return `SDP ${payload.sdp.type?.toUpperCase()} (${payload.sdp.sdp?.length || 0} bytes)`;
            }
            if (payload.ice) {
                const c = payload.ice.candidate;
                const match = c?.match(/candidate:\S+\s+\d+\s+(\S+)\s+\d+\s+(\S+)\s+(\d+)\s+typ\s+(\S+)/);
                if (match) {
                    return `ICE Candidate [typ: ${match[4].toUpperCase()}] ${match[2]}:${match[3]} (${match[1]})`;
                }
                return `ICE Candidate: ${payload.ice.candidate?.substring(0, 40) || 'end-of-candidates'}...`;
            }
            if (payload.connected !== undefined) {
                return `Handshake probe connected: ${payload.connected}`;
            }
        }
        if (type === 'peers') return `Discovered ${(payload.peers || []).length} active peer(s) in room [${payload.roomType || 'LAN'}]`;
        if (type === 'peer-joined') return `Peer Joined: ${payload.peer?.name?.displayName || payload.peer?.id || 'Unknown'}`;
        if (type === 'peer-left') return `Peer Left: ${payload.peerId} (${payload.roomType || 'LAN'})`;
        if (type === 'request') return `File Transfer Request: ${(payload.header || []).length} file(s), Total: ${this.formatBytes(payload.totalSize || 0)}`;
        if (type === 'header') return `File Header: "${payload.name}" (${this.formatBytes(payload.size || 0)}, ${payload.mime || 'unknown'})`;
        if (type === 'partition') return `Flow Control Partition @ offset ${this.formatBytes(payload.offset || 0)}`;
        if (type === 'partition-received') return `ACK Partition @ offset ${this.formatBytes(payload.offset || 0)}`;
        if (type === 'progress') return `Transfer Progress: ${(payload.progress * 100).toFixed(1)}%`;
        if (type === 'ping') return 'Signaling Heartbeat Ping';
        if (type === 'pong') return 'Signaling Heartbeat Pong';
        return JSON.stringify(payload).substring(0, 70);
    }

    parseSDP(sdp) {
        if (!sdp || typeof sdp !== 'string') return null;
        const lines = sdp.split(/\r\n|\n/);
        const result = {
            version: null,
            origin: null,
            sessionName: null,
            connection: null,
            iceUfrag: null,
            icePwd: null,
            fingerprint: null,
            candidates: [],
            media: [],
            setup: null,
            mid: null,
            rawLinesCount: lines.length
        };

        let currentMedia = null;

        for (const line of lines) {
            if (line.startsWith('v=')) result.version = line.substring(2);
            else if (line.startsWith('o=')) result.origin = line.substring(2);
            else if (line.startsWith('s=')) result.sessionName = line.substring(2);
            else if (line.startsWith('c=')) result.connection = line.substring(2);
            else if (line.startsWith('a=ice-ufrag:')) result.iceUfrag = line.substring(12);
            else if (line.startsWith('a=ice-pwd:')) result.icePwd = line.substring(10);
            else if (line.startsWith('a=fingerprint:')) result.fingerprint = line.substring(14);
            else if (line.startsWith('a=setup:')) result.setup = line.substring(8);
            else if (line.startsWith('a=mid:')) result.mid = line.substring(6);
            else if (line.startsWith('a=candidate:')) {
                const parts = line.substring(12).split(' ');
                result.candidates.push({
                    foundation: parts[0],
                    component: parts[1],
                    protocol: parts[2],
                    priority: parts[3],
                    ip: parts[4],
                    port: parts[5],
                    type: parts[7] || 'host'
                });
            } else if (line.startsWith('m=')) {
                currentMedia = { line: line.substring(2) };
                result.media.push(currentMedia);
            }
        }
        return result;
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getLogs(filter = 'all', query = '') {
        return this.logs.filter(entry => {
            if (filter !== 'all' && entry.category !== filter) return false;
            if (query) {
                const q = query.toLowerCase();
                const matched = entry.type.toLowerCase().includes(q) ||
                    entry.summary.toLowerCase().includes(q) ||
                    entry.rawJson.toLowerCase().includes(q);
                if (!matched) return false;
            }
            return true;
        });
    }

    clearLogs() {
        this.logs = [];
        this.stats.totalPackets = 0;
        this.stats.signalingPackets = 0;
        this.stats.iceCandidates = 0;
        this.stats.sdpOffers = 0;
        this.stats.sdpAnswers = 0;
        this.stats.dataChannelPackets = 0;
        this.stats.bytesLogged = 0;
        if (window.Events) Events.fire('protocol-logs-cleared');
    }

    exportJSON() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            stats: this.stats,
            packets: this.logs
        }, null, 2);
    }
}

// Global singleton instance
window.protocolInspector = new ProtocolInspector();

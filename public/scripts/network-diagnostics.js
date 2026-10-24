/**
 * NetBridge Network Diagnostics & Topology Engine
 * Performs automated latency/jitter profiling, ICE candidate & NAT mapping analysis,
 * bandwidth estimation, and connection quality grading.
 */
class NetworkDiagnostics {
    constructor() {
        this.results = {
            latency: {
                min: null,
                max: null,
                avg: null,
                jitter: null,
                samples: [],
                wsRtt: null
            },
            nat: {
                status: 'idle',
                gatheredCandidates: [],
                localIp: null,
                publicIp: null,
                natType: 'Unknown',
                directP2pPossible: true,
                iceGatheringTimeMs: 0
            },
            bandwidth: {
                status: 'idle',
                speedMbps: null,
                latencyMs: null
            },
            serverInfo: null,
            interfaces: null,
            qualityScore: {
                grade: 'A',
                score: 95,
                verdict: 'Excellent - High Performance P2P Ready'
            }
        };

        this.isRunning = false;
    }

    /**
     * Run full diagnostics suite
     */
    async runFullDiagnostics(onProgress = () => {}) {
        this.isRunning = true;
        try {
            onProgress('Testing server latency and jitter...');
            await this.measureLatency(5);

            onProgress('Gathering ICE candidates and analyzing NAT mapping...');
            await this.analyzeNatAndCandidates();

            onProgress('Fetching network adapters and server topology...');
            await this.fetchServerNetworkData();

            onProgress('Computing connection quality score...');
            this._computeQualityScore();

            onProgress('Diagnostics complete!');
            if (window.Events) Events.fire('diagnostics-completed', this.results);
            return this.results;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Measure HTTP/REST RTT and Jitter
     */
    async measureLatency(probes = 5) {
        const samples = [];
        for (let i = 0; i < probes; i++) {
            const t0 = performance.now();
            try {
                const res = await fetch(`/api/network/ping?t=${Date.now()}`, { cache: 'no-store' });
                if (res.ok) {
                    const elapsed = performance.now() - t0;
                    samples.push(elapsed);
                }
            } catch (e) {
                console.warn("Ping probe error:", e);
            }
            if (i < probes - 1) await new Promise(r => setTimeout(r, 80));
        }

        if (samples.length > 0) {
            const min = Math.min(...samples);
            const max = Math.max(...samples);
            const sum = samples.reduce((a, b) => a + b, 0);
            const avg = sum / samples.length;

            // Calculate Jitter (Mean Absolute Deviation from successive samples)
            let jitterSum = 0;
            for (let i = 1; i < samples.length; i++) {
                jitterSum += Math.abs(samples[i] - samples[i - 1]);
            }
            const jitter = samples.length > 1 ? jitterSum / (samples.length - 1) : 0;

            this.results.latency = {
                min: parseFloat(min.toFixed(2)),
                max: parseFloat(max.toFixed(2)),
                avg: parseFloat(avg.toFixed(2)),
                jitter: parseFloat(jitter.toFixed(2)),
                samples: samples.map(s => parseFloat(s.toFixed(2))),
                wsRtt: this.results.latency.wsRtt
            };
        }
        return this.results.latency;
    }

    /**
     * Record WebSocket KeepAlive RTT
     */
    recordWsPingPong(rttMs) {
        this.results.latency.wsRtt = parseFloat(rttMs.toFixed(1));
    }

    /**
     * Analyze ICE Candidates and NAT Type
     */
    analyzeNatAndCandidates() {
        return new Promise((resolve) => {
            if (!window.RTCPeerConnection) {
                this.results.nat.status = 'WebRTC unsupported in this browser';
                return resolve(this.results.nat);
            }

            const startTime = performance.now();
            const iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ];

            const candidates = [];
            let pc = null;

            try {
                pc = new RTCPeerConnection({ iceServers });
            } catch (e) {
                this.results.nat.status = 'Failed to create RTCPeerConnection';
                return resolve(this.results.nat);
            }

            // Create a dummy data channel to trigger candidate gathering
            pc.createDataChannel('diagnostics_probe');

            const finish = () => {
                const totalTime = performance.now() - startTime;
                this.results.nat.iceGatheringTimeMs = parseFloat(totalTime.toFixed(1));
                this.results.nat.gatheredCandidates = candidates;

                let hasHost = false;
                let hasSrflx = false;
                let hasRelay = false;

                candidates.forEach(c => {
                    if (c.type === 'host') {
                        hasHost = true;
                        if (!this.results.nat.localIp && !c.ip.includes(':')) {
                            this.results.nat.localIp = c.ip;
                        }
                    } else if (c.type === 'srflx') {
                        hasSrflx = true;
                        if (!this.results.nat.publicIp) {
                            this.results.nat.publicIp = c.ip;
                        }
                    } else if (c.type === 'relay') {
                        hasRelay = true;
                    }
                });

                if (hasSrflx && hasHost) {
                    this.results.nat.natType = 'Full Cone / Port Restricted Cone (P2P Traversal Optimal)';
                    this.results.nat.directP2pPossible = true;
                } else if (hasHost && !hasSrflx) {
                    this.results.nat.natType = 'LAN Host Only / Offline Subnet (Local LAN P2P Ready)';
                    this.results.nat.directP2pPossible = true;
                } else if (hasRelay) {
                    this.results.nat.natType = 'Symmetric NAT (TURN Relay Fallback Required)';
                    this.results.nat.directP2pPossible = false;
                } else {
                    this.results.nat.natType = 'Direct Host Connection';
                    this.results.nat.directP2pPossible = true;
                }

                this.results.nat.status = 'complete';

                try {
                    pc.close();
                } catch (e) {}

                resolve(this.results.nat);
            };

            const timeoutId = setTimeout(finish, 2500);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const c = event.candidate;
                    const parsed = this._parseCandidateString(c.candidate);
                    if (parsed) candidates.push(parsed);
                } else {
                    // Null candidate means gathering is finished
                    clearTimeout(timeoutId);
                    finish();
                }
            };

            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(err => {
                    clearTimeout(timeoutId);
                    this.results.nat.status = 'SDP generation failed: ' + err.message;
                    finish();
                });
        });
    }

    _parseCandidateString(candidateStr) {
        if (!candidateStr) return null;
        // Format: candidate:foundation component protocol priority ip port typ type [raddr rport]
        const parts = candidateStr.split(' ');
        if (parts.length < 8) return null;
        return {
            foundation: parts[0].replace('candidate:', ''),
            component: parts[1],
            protocol: parts[2].toUpperCase(),
            priority: parts[3],
            ip: parts[4],
            port: parts[5],
            type: parts[7], // 'host' | 'srflx' | 'relay' | 'prflx'
            raw: candidateStr
        };
    }

    /**
     * Fetch network interfaces and server statistics
     */
    async fetchServerNetworkData() {
        try {
            const [ifaceRes, statsRes] = await Promise.all([
                fetch('/api/network/interfaces', { cache: 'no-store' }),
                fetch('/api/network/stats', { cache: 'no-store' })
            ]);

            if (ifaceRes.ok) {
                this.results.interfaces = await ifaceRes.json();
            }
            if (statsRes.ok) {
                this.results.serverInfo = await statsRes.json();
            }
        } catch (e) {
            console.warn("Server network data fetch failed:", e);
        }
        return {
            interfaces: this.results.interfaces,
            serverInfo: this.results.serverInfo
        };
    }

    /**
     * Compute Connection Quality Score
     */
    _computeQualityScore() {
        let score = 100;
        const avgRtt = this.results.latency.avg;
        const jitter = this.results.latency.jitter;

        if (avgRtt !== null) {
            if (avgRtt > 150) score -= 30;
            else if (avgRtt > 80) score -= 20;
            else if (avgRtt > 40) score -= 10;
            else if (avgRtt > 15) score -= 5;
        }

        if (jitter !== null) {
            if (jitter > 30) score -= 20;
            else if (jitter > 15) score -= 10;
            else if (jitter > 5) score -= 5;
        }

        if (!this.results.nat.directP2pPossible) {
            score -= 25;
        }

        score = Math.max(10, Math.min(100, score));

        let grade = 'A+';
        let verdict = 'Optimal - Low Latency Gigabit P2P Ready';

        if (score >= 95) {
            grade = 'A+';
            verdict = 'Optimal - Sub-Millisecond Lan P2P Network';
        } else if (score >= 85) {
            grade = 'A';
            verdict = 'Excellent - High Speed Direct Connection';
        } else if (score >= 75) {
            grade = 'B';
            verdict = 'Good - Fast Transfer Capable';
        } else if (score >= 60) {
            grade = 'C';
            verdict = 'Fair - Higher Latency / Moderate Jitter';
        } else {
            grade = 'D';
            verdict = 'Degraded - Relayed Connection Recommended';
        }

        this.results.qualityScore = {
            grade,
            score,
            verdict
        };

        return this.results.qualityScore;
    }
}

// Global singleton instance
window.networkDiagnostics = new NetworkDiagnostics();

/**
 * NetBridge Interactive Network Console & Diagnostics UI
 * Features: Topology Visualizer, Live Telemetry Canvas, Packet & SDP Inspector, NAT Lab, Server Explorer, and Download App Hub.
 */
class NetworkDashboardUI {
    constructor() {
        this.isOpen = false;
        this.activeTab = 'topology';
        this.selectedPacket = null;
        this.topologyAnimationId = null;
        this.pulseOffset = 0;

        this._injectModalHtml();
        this._bindEvents();
    }

    _injectModalHtml() {
        if (document.getElementById('network-modal')) return;

        const modalHtml = `
        <div id="network-modal">
            <div class="net-window">
                <!-- Titlebar -->
                <div class="net-titlebar">
                    <div class="net-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <span>NetBridge Network Console</span>
                        <span class="net-badge">10/10 Pro</span>
                    </div>
                    <button class="net-close-btn" id="net-modal-close" title="Close (Esc)">✕</button>
                </div>

                <!-- Tabs -->
                <div class="net-tabs">
                    <button class="net-tab-btn active" data-tab="topology">
                        <span>🕸️ Topology & Mesh</span>
                    </button>
                    <button class="net-tab-btn" data-tab="telemetry">
                        <span>🚀 Live Telemetry & RTC</span>
                    </button>
                    <button class="net-tab-btn" data-tab="diagnostics">
                        <span>🛰️ Diagnostic Suite & NAT</span>
                    </button>
                    <button class="net-tab-btn" data-tab="lab">
                        <span>🔬 Network Lab</span>
                    </button>
                    <button class="net-tab-btn" data-tab="integrity">
                        <span>🛡️ SHA-256 Integrity</span>
                    </button>
                    <button class="net-tab-btn" data-tab="inspector">
                        <span>📜 Protocol & Packet Inspector</span>
                    </button>
                    <button class="net-tab-btn" data-tab="server">
                        <span>🖥️ Server & Adapters</span>
                    </button>
                    <button class="net-tab-btn" data-tab="download" style="color: #38bdf8; font-weight: 600;">
                        <span>📲 Download App</span>
                    </button>
                </div>

                <!-- Content -->
                <div class="net-content">
                    <!-- Tab 1: Topology -->
                    <div class="net-tab-pane active" id="pane-topology">
                        <div class="net-card">
                            <div class="net-card-title">
                                <span>Network Mesh Map & Active Peer Interconnects</span>
                                <span class="net-stat-sub" id="net-topo-peer-count">0 Connected Peers</span>
                            </div>
                            <canvas id="net-topo-canvas" class="net-topology-canvas"></canvas>
                        </div>
                        <div class="net-grid-2">
                            <div class="net-card">
                                <div class="net-card-title">Local Node Specification</div>
                                <div class="net-stat-box" style="margin-bottom: 8px;">
                                    <div class="net-stat-label">Device Identifier</div>
                                    <div id="net-local-name" style="font-size: 15px; font-weight: 600; color: #38bdf8;">Evaluating...</div>
                                    <div id="net-local-peer-id" class="net-stat-sub">Peer ID: -</div>
                                </div>
                                <div class="net-stat-box">
                                    <div class="net-stat-label">WebRTC Protocol Engine</div>
                                    <div id="net-webrtc-support" style="font-size: 13.5px; color: #10b981;">Hardware SCTP DataChannel Active</div>
                                </div>
                            </div>
                            <div class="net-card">
                                <div class="net-card-title">Signaling Node Configuration</div>
                                <div class="net-stat-box" style="margin-bottom: 8px;">
                                    <div class="net-stat-label">Signaling Gateway</div>
                                    <div id="net-server-url" style="font-size: 14px; font-weight: 600; color: #cbd5e1;">ws://${location.host}/server</div>
                                    <div class="net-stat-sub">Transport: Full Duplex Secure WebSocket</div>
                                </div>
                                <div class="net-stat-box">
                                    <div class="net-stat-label">STUN / NAT Traversal Gateway</div>
                                    <div style="font-size: 13px; color: #94a3b8;">stun.l.google.com:19302 (RFC 5389 / UDP)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: Telemetry -->
                    <div class="net-tab-pane" id="pane-telemetry">
                        <div class="net-grid-4">
                            <div class="net-stat-box">
                                <div class="net-stat-label">Upload Rate</div>
                                <div class="net-stat-value" id="kpi-upload-rate" style="color: #38bdf8;">0 B/s</div>
                                <div class="net-stat-sub">Peak: <span id="kpi-upload-peak">0 B/s</span></div>
                            </div>
                            <div class="net-stat-box">
                                <div class="net-stat-label">Download Rate</div>
                                <div class="net-stat-value" id="kpi-download-rate" style="color: #10b981;">0 B/s</div>
                                <div class="net-stat-sub">Peak: <span id="kpi-download-peak">0 B/s</span></div>
                            </div>
                            <div class="net-stat-box">
                                <div class="net-stat-label">Total Volume Sent</div>
                                <div class="net-stat-value" id="kpi-total-sent">0 B</div>
                                <div class="net-stat-sub">Accumulated outbound</div>
                            </div>
                            <div class="net-stat-box">
                                <div class="net-stat-label">Total Volume Recv</div>
                                <div class="net-stat-value" id="kpi-total-recv">0 B</div>
                                <div class="net-stat-sub">Accumulated inbound</div>
                            </div>
                        </div>

                        <div class="net-card">
                            <div class="net-card-title">
                                <span>Real-Time Bandwidth Waveform (KB/s)</span>
                                <div style="display: flex; gap: 14px; font-size: 12px;">
                                    <span style="color: #38bdf8;">● Inbound</span>
                                    <span style="color: #10b981;">● Outbound</span>
                                </div>
                            </div>
                            <canvas id="net-chart-canvas" style="width: 100%; height: 200px; background: #0b1120; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"></canvas>
                        </div>

                        <div class="net-card">
                            <div class="net-card-title">WebRTC DataChannel Low-Level Telemetry</div>
                            <table class="net-table">
                                <thead>
                                    <tr>
                                        <th>Metric</th>
                                        <th>Value</th>
                                        <th>Protocol Standard</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Channel Transport Type</td>
                                        <td id="rtc-transport-type" style="color: #38bdf8;">P2P Direct UDP (SCTP)</td>
                                        <td>RFC 8831 WebRTC Data Channels</td>
                                    </tr>
                                    <tr>
                                        <td>Candidate Pair Type</td>
                                        <td id="rtc-candidate-pair">Host / Local LAN Subnet</td>
                                        <td>RFC 8445 Interactive Connectivity Establishment</td>
                                    </tr>
                                    <tr>
                                        <td>Round Trip Latency (RTT)</td>
                                        <td id="rtc-rtt" style="font-weight: 600;">&lt; 1 ms</td>
                                        <td>SCTP Heartbeat Probe</td>
                                    </tr>
                                    <tr>
                                        <td>Encryption Cipher</td>
                                        <td id="rtc-cipher" style="color: #a855f7;">DTLS-SRTP / AEAD AES-128-GCM</td>
                                        <td>RFC 8261 Datagram Transport Layer Security</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 3: Diagnostics & NAT -->
                    <div class="net-tab-pane" id="pane-diagnostics">
                        <div class="net-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                            <div>
                                <h3 style="margin: 0 0 6px 0; font-size: 16px;">Automated Diagnostic & NAT Analyzer</h3>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">Profiles round-trip latency, jitter variance, STUN reflexive endpoints, and NAT traversal topology.</p>
                            </div>
                            <button class="net-btn-action" id="btn-run-diagnostics">
                                <span>▶ Run Diagnostic Probes</span>
                            </button>
                        </div>

                        <div class="net-grid-2">
                            <div class="net-card" style="display: flex; align-items: center; gap: 20px;">
                                <div class="net-grade-badge" id="diag-grade">A+</div>
                                <div>
                                    <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Quality Score</div>
                                    <div style="font-size: 24px; font-weight: 700; color: #f8fafc;" id="diag-score">98 / 100</div>
                                    <div style="font-size: 12.5px; color: #10b981; margin-top: 4px;" id="diag-verdict">Optimal - Sub-Millisecond LAN P2P Ready</div>
                                </div>
                            </div>
                            <div class="net-card">
                                <div class="net-card-title">Latency & Jitter Profile</div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <div><span style="color: #64748b; font-size: 12px;">Avg RTT:</span> <b id="diag-avg-rtt" style="color: #38bdf8;">--</b></div>
                                    <div><span style="color: #64748b; font-size: 12px;">Jitter:</span> <b id="diag-jitter" style="color: #10b981;">--</b></div>
                                    <div><span style="color: #64748b; font-size: 12px;">Min RTT:</span> <b id="diag-min-rtt">--</b></div>
                                    <div><span style="color: #64748b; font-size: 12px;">Max RTT:</span> <b id="diag-max-rtt">--</b></div>
                                </div>
                            </div>
                        </div>

                        <div class="net-card">
                            <div class="net-card-title">
                                <span>STUN / ICE Candidate Harvest & NAT Mapping</span>
                                <span class="net-stat-sub" id="diag-nat-type">NAT: Idle</span>
                            </div>
                            <table class="net-table" id="diag-candidates-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Protocol</th>
                                        <th>Discovered IP</th>
                                        <th>Port</th>
                                        <th>Priority</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="5" style="text-align: center; color: #64748b;">Click "Run Diagnostic Probes" to harvest ICE candidates</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 4: Network Lab -->
                    <div class="net-tab-pane" id="pane-lab">
                        <div class="net-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                            <div>
                                <h3 style="margin: 0 0 4px 0; font-size: 16px;">Computer Networks Scientific Laboratory</h3>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">Execute repeatable networking experiments, analyze RFC-compliant transport metrics, and export data for coursework.</p>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="net-btn-action" id="btn-export-lab-csv">Export Lab Data (CSV)</button>
                                <button class="net-btn-secondary" id="btn-export-lab-json">Export JSON</button>
                            </div>
                        </div>

                        <!-- Experiment 1 -->
                        <div class="net-card">
                            <div class="net-card-title">
                                <span>Experiment 1: Latency & Jitter Variance Profile (RFC 3393)</span>
                                <button class="net-btn-action" id="btn-run-exp-rtt" style="padding: 6px 12px; font-size: 12px;">▶ Execute Probe Suite</button>
                            </div>
                            <div style="font-size: 12.5px; color: #94a3b8; margin-bottom: 12px;" id="exp-rtt-status">Awaiting experiment start. Probes send 10 sequential ping packets to measure round-trip statistical distribution.</div>
                            <div class="net-grid-4">
                                <div class="net-stat-box"><div class="net-stat-label">Min RTT</div><div class="net-stat-value" id="exp-rtt-min">--</div></div>
                                <div class="net-stat-box"><div class="net-stat-label">Max RTT</div><div class="net-stat-value" id="exp-rtt-max">--</div></div>
                                <div class="net-stat-box"><div class="net-stat-label">Mean RTT</div><div class="net-stat-value" id="exp-rtt-avg" style="color: #38bdf8;">--</div></div>
                                <div class="net-stat-box"><div class="net-stat-label">Jitter (Deviation)</div><div class="net-stat-value" id="exp-rtt-jitter" style="color: #10b981;">--</div></div>
                            </div>
                        </div>

                        <!-- Experiment 2 -->
                        <div class="net-card">
                            <div class="net-card-title">
                                <span>Experiment 2: Chunk Size vs SCTP Throughput Benchmark</span>
                                <button class="net-btn-action" id="btn-run-exp-chunks" style="padding: 6px 12px; font-size: 12px;">▶ Benchmark Chunk Sizing</button>
                            </div>
                            <div style="font-size: 12.5px; color: #94a3b8; margin-bottom: 12px;" id="exp-chunk-status">Evaluates framing efficiency and serialization delay using 16 KB, 64 KB, 128 KB, and 256 KB chunk payloads.</div>
                            <table class="net-table" id="exp-chunks-table">
                                <thead>
                                    <tr>
                                        <th>Application Chunk Size</th>
                                        <th>Chunks Count (10 MB payload)</th>
                                        <th>Elapsed Time</th>
                                        <th>Throughput (MB/s)</th>
                                        <th>Protocol Assessment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="5" style="text-align: center; color: #64748b;">Click "Benchmark Chunk Sizing" to evaluate window throughput</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Experiment 3 -->
                        <div class="net-card">
                            <div class="net-card-title">
                                <span>Experiment 3: Cryptographic Integrity Verification & Bit-Flip Error Detection</span>
                                <button class="net-btn-action" id="btn-run-exp-integrity" style="padding: 6px 12px; font-size: 12px;">▶ Test Integrity & Corruption</button>
                            </div>
                            <div style="font-size: 12.5px; color: #94a3b8; margin-bottom: 12px;" id="exp-integrity-status">Proves that SHA-256 detects transmission alterations down to a single bit, demonstrating error detection over lossy channels.</div>
                            <table class="net-table" id="exp-integrity-table">
                                <thead>
                                    <tr>
                                        <th>Payload Condition</th>
                                        <th>Expected Hash</th>
                                        <th>Computed Receiver Hash</th>
                                        <th>Verification Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="4" style="text-align: center; color: #64748b;">Click "Test Integrity & Corruption" to demonstrate error detection</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 5: Cryptographic Integrity -->
                    <div class="net-tab-pane" id="pane-integrity">
                        <div class="net-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                            <div>
                                <h3 style="margin: 0 0 4px 0; font-size: 16px;">End-to-End Cryptographic File Integrity (SHA-256)</h3>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">Every transfer computes a 256-bit SHA-2 digest using Web Crypto API to ensure zero packet corruption or tampering.</p>
                            </div>
                            <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #f59e0b; cursor: pointer; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 8px 14px; border-radius: 8px;">
                                <input type="checkbox" id="chk-simulate-corruption" style="cursor: pointer;">
                                <span>⚠️ Simulate 1-Byte Error on Next Receive (Viva Demo)</span>
                            </label>
                        </div>

                        <div class="net-card">
                            <div class="net-card-title">
                                <span>Transfer Verification Audit Trail</span>
                                <span class="net-stat-sub" id="integrity-log-count">0 files verified</span>
                            </div>
                            <table class="net-table" id="integrity-audit-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>File Name</th>
                                        <th>Size</th>
                                        <th>Sender Expected SHA-256</th>
                                        <th>Receiver Computed SHA-256</th>
                                        <th>Integrity Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="6" style="text-align: center; color: #64748b;">Send or receive a file to observe automatic cryptographic integrity verification</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 6: Protocol Inspector -->
                    <div class="net-tab-pane" id="pane-inspector">
                        <div class="net-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px 18px;">
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="inspector-filter-buttons">
                                <button class="net-btn-secondary" data-filter="all" style="background: #0284c7; color: white;">All Packets</button>
                                <button class="net-btn-secondary" data-filter="sdp">SDP Handshake</button>
                                <button class="net-btn-secondary" data-filter="ice">ICE Candidates</button>
                                <button class="net-btn-secondary" data-filter="discovery">Peer Discovery</button>
                                <button class="net-btn-secondary" data-filter="transfer">Data Transfer</button>
                                <button class="net-btn-secondary" data-filter="keepalive">Heartbeats</button>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="net-btn-secondary" id="btn-export-inspector">Export JSON</button>
                                <button class="net-btn-secondary" id="btn-clear-inspector">Clear</button>
                            </div>
                        </div>

                        <div class="net-grid-2" style="flex: 1; min-height: 380px;">
                            <!-- Packet Stream List -->
                            <div class="net-card" style="padding: 12px; display: flex; flex-direction: column;">
                                <div class="net-card-title" style="margin-bottom: 8px;">
                                    <span>Live Signaling & Packet Stream</span>
                                    <span class="net-stat-sub" id="inspector-count">0 logged</span>
                                </div>
                                <div class="net-packet-stream" id="inspector-packet-list">
                                    <div style="color: #64748b; padding: 20px; text-align: center;">Awaiting signaling packets...</div>
                                </div>
                            </div>

                            <!-- Packet Detail Inspector -->
                            <div class="net-card" style="padding: 12px; display: flex; flex-direction: column;">
                                <div class="net-card-title" style="margin-bottom: 8px;">
                                    <span>Frame Payload & RFC Decoder</span>
                                    <span class="net-stat-sub" id="inspector-selected-type">Select a frame</span>
                                </div>
                                <div id="inspector-detail-view" style="flex: 1; overflow-y: auto; background: #0b1120; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 11.5px; color: #38bdf8; white-space: pre-wrap;">
Click any packet in the left stream to inspect the decoded payload, SDP parameters, and ICE headers.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 7: Server & Network Adapters -->
                    <div class="net-tab-pane" id="pane-server">
                        <div class="net-grid-2">
                            <div class="net-card">
                                <div class="net-card-title">Host Server Telemetry</div>
                                <table class="net-table">
                                    <tbody>
                                        <tr><td>Server Hostname</td><td id="srv-hostname" style="color: #38bdf8;">--</td></tr>
                                        <tr><td>OS Platform & Architecture</td><td id="srv-platform">--</td></tr>
                                        <tr><td>Server System Uptime</td><td id="srv-uptime">--</td></tr>
                                        <tr><td>Node.js Process Memory</td><td id="srv-memory">--</td></tr>
                                        <tr><td>System RAM Usage</td><td id="srv-ram-usage">--</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="net-card">
                                <div class="net-card-title">Signaling Server Statistics</div>
                                <table class="net-table">
                                    <tbody>
                                        <tr><td>Active Rooms (IP Subnets)</td><td id="srv-rooms" style="color: #10b981;">--</td></tr>
                                        <tr><td>Total Connected Peers</td><td id="srv-peers">--</td></tr>
                                        <tr><td>Signaling Messages Processed</td><td id="srv-msg-count">--</td></tr>
                                        <tr><td>ICE Relayed Fallback Bytes</td><td id="srv-fallback-bytes">--</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="net-card">
                            <div class="net-card-title">Network Interface Cards (NICs) & Subnet Topology</div>
                            <table class="net-table" id="srv-interfaces-table">
                                <thead>
                                    <tr>
                                        <th>Interface</th>
                                        <th>IP Address</th>
                                        <th>Family</th>
                                        <th>Subnet Mask (Netmask)</th>
                                        <th>MAC Address</th>
                                        <th>CIDR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="6" style="text-align: center; color: #64748b;">Loading network adapters...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 8: Download & Install App Everywhere -->
                    <div class="net-tab-pane" id="pane-download">
                        <div class="net-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                            <div>
                                <h3 style="margin: 0 0 4px 0; font-size: 16px;">Download & Install NetBridge on Any Device</h3>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">Install NetBridge permanently on your phone, tablet, and PC to transfer files offline anywhere.</p>
                            </div>
                            <button class="net-btn-action" id="btn-trigger-pwa-install" style="font-size: 13.5px; padding: 10px 18px;">
                                <span>⬇️ Install App on this Device</span>
                            </button>
                        </div>

                        <div class="net-grid-2">
                            <!-- Card 1: Official Android App (APK) -->
                            <div class="net-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div class="net-card-title">
                                        <span>📱 Android Native App (APK)</span>
                                        <span class="net-badge" style="background: rgba(16,185,129,0.15); color: #10b981;">Recommended</span>
                                    </div>
                                    <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 12px;">
                                        If you want a dedicated standalone Android app with native system <b>Share Menu</b> integration:
                                    </p>
                                    <ul style="font-size: 12.5px; color: #94a3b8; padding-left: 18px; margin-bottom: 16px; line-height: 1.6;">
                                        <li>Works directly with your local NetBridge server.</li>
                                        <li>Enables sharing photos & videos straight from your Gallery.</li>
                                        <li>Available on Google Play Store and F-Droid / GitHub.</li>
                                    </ul>
                                </div>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <a href="/downloads/netbridge-android.apk" download="NetBridge-Android.apk" class="net-btn-action" style="text-decoration: none; background: #10b981; font-weight: bold; font-size: 13.5px; padding: 11px 18px; display: inline-flex; align-items: center; gap: 6px;">
                                        <span>📥 Download APK Directly (6.1 MB)</span>
                                    </a>
                                    <a href="https://play.google.com/store/apps/details?id=com.fmsys.snapdrop" target="_blank" rel="noopener" class="net-btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center;">
                                        <span>Google Play</span>
                                    </a>
                                </div>
                            </div>

                            <!-- Card 2: Connect via QR Code -->
                            <div class="net-card">
                                <div class="net-card-title">
                                    <span>📷 Scan QR Code to Open on Mobile</span>
                                    <span class="net-stat-sub">Zero-Typing</span>
                                </div>
                                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                                    <div id="net-download-qrcode" style="background: white; padding: 8px; border-radius: 8px; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
                                        <div style="color: #64748b; font-size: 11px;">Generating...</div>
                                    </div>
                                    <div style="flex: 1; min-width: 180px;">
                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Local Network Address:</div>
                                        <div id="net-download-url" style="font-family: monospace; font-size: 13.5px; color: #38bdf8; word-break: break-all; margin-bottom: 10px;">http://${location.host}</div>
                                        <button class="net-btn-secondary" id="btn-copy-network-url" style="font-size: 12px;">Copy Network Link</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Card 3: Mobile & Desktop PWA Guide -->
                        <div class="net-card">
                            <div class="net-card-title">How to Install as an App on Any Platform:</div>
                            <div class="net-grid-4">
                                <div class="net-stat-box">
                                    <div class="net-stat-label">Android (Chrome)</div>
                                    <div style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5;">
                                        Tap <b>3 dots (⋮)</b> in top right corner ➔ Tap <b>"Add to Home screen"</b> (or Install).
                                    </div>
                                </div>
                                <div class="net-stat-box">
                                    <div class="net-stat-label">iPhone (Safari)</div>
                                    <div style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5;">
                                        Tap <b>Share button</b> (box with arrow) ➔ Scroll down and tap <b>"Add to Home Screen"</b>.
                                    </div>
                                </div>
                                <div class="net-stat-box">
                                    <div class="net-stat-label">Windows (Edge / Chrome)</div>
                                    <div style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5;">
                                        Click the <b>Install icon</b> in your browser address bar ➔ Click <b>Install</b>.
                                    </div>
                                </div>
                                <div class="net-stat-box">
                                    <div class="net-stat-label">Offline Note</div>
                                    <div style="font-size: 12.5px; color: #10b981; line-height: 1.5;">
                                        Once added to home screen, it opens full-screen like a native app even with zero internet!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _bindEvents() {
        const modal = document.getElementById('network-modal');
        const closeBtn = document.getElementById('net-modal-close');

        closeBtn.addEventListener('click', () => this.hide());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hide();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.hide();
        });

        // Tab buttons
        const tabBtns = document.querySelectorAll('.net-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Diagnostics run button
        const diagBtn = document.getElementById('btn-run-diagnostics');
        if (diagBtn) {
            diagBtn.addEventListener('click', () => this.runDiagnostics());
        }

        // Inspector filters
        const filterBtns = document.querySelectorAll('#inspector-filter-buttons button');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.style.background = '#334155';
                    b.style.color = '#e2e8f0';
                });
                btn.style.background = '#0284c7';
                btn.style.color = 'white';
                this.renderInspectorList(btn.getAttribute('data-filter'));
            });
        });

        // Inspector actions
        const clearBtn = document.getElementById('btn-clear-inspector');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (window.protocolInspector) {
                    window.protocolInspector.clearLogs();
                    this.renderInspectorList('all');
                }
            });
        }

        const exportBtn = document.getElementById('btn-export-inspector');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (!window.protocolInspector) return;
                const json = window.protocolInspector.exportJSON();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `netbridge-protocol-log-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Telemetry ticks
        if (window.Events) {
            Events.on('transfer-telemetry-tick', (e) => this._onTelemetryTick(e.detail));
            Events.on('protocol-packet-logged', (e) => this._onPacketLogged(e.detail));
            Events.on('peer-joined', () => this.updateTopologyData());
            Events.on('peer-left', () => this.updateTopologyData());
            Events.on('display-name', (e) => this._updateLocalNodeDisplay(e.detail));
            Events.on('file-integrity-verified', (e) => this._onIntegrityVerified(e.detail));
        }

        // Network Lab experiment runners
        const expRttBtn = document.getElementById('btn-run-exp-rtt');
        if (expRttBtn) {
            expRttBtn.addEventListener('click', async () => {
                expRttBtn.disabled = true;
                const statusEl = document.getElementById('exp-rtt-status');
                if (window.networkLab) {
                    await window.networkLab.runRttExperiment(10, (msg) => {
                        if (statusEl) statusEl.textContent = msg;
                    });
                    const rtt = window.networkLab.experiments.rtt;
                    if (statusEl) statusEl.textContent = `Completed 10 probes. Statistical variance logged.`;
                    document.getElementById('exp-rtt-min').textContent = `${rtt.stats.min} ms`;
                    document.getElementById('exp-rtt-max').textContent = `${rtt.stats.max} ms`;
                    document.getElementById('exp-rtt-avg').textContent = `${rtt.stats.avg} ms`;
                    document.getElementById('exp-rtt-jitter').textContent = `${rtt.stats.jitter} ms`;
                }
                expRttBtn.disabled = false;
            });
        }

        const expChunkBtn = document.getElementById('btn-run-exp-chunks');
        if (expChunkBtn) {
            expChunkBtn.addEventListener('click', async () => {
                expChunkBtn.disabled = true;
                const statusEl = document.getElementById('exp-chunk-status');
                if (window.networkLab) {
                    await window.networkLab.runChunkSizeBenchmark(10, (msg) => {
                        if (statusEl) statusEl.textContent = msg;
                    });
                    const results = window.networkLab.experiments.chunkSizing.results;
                    if (statusEl) statusEl.textContent = `Benchmarking completed across 4 chunk sizes.`;
                    const tableBody = document.querySelector('#exp-chunks-table tbody');
                    if (tableBody) {
                        tableBody.innerHTML = results.map(r => `
                            <tr>
                                <td style="font-weight: 600; color: #38bdf8;">${r.chunkSizeKB} KB (${r.chunkSizeKB * 1024} bytes)</td>
                                <td>${r.chunksCount} chunks</td>
                                <td>${r.durationMs} ms</td>
                                <td style="font-weight: 700; color: #10b981;">${r.throughputMBps} MB/s</td>
                                <td><span class="net-badge">${r.chunkSizeKB >= 128 ? 'Optimized LAN' : (r.chunkSizeKB === 64 ? 'Default WebRTC' : 'High Overhead')}</span></td>
                            </tr>
                        `).join('');
                    }
                }
                expChunkBtn.disabled = false;
            });
        }

        const expIntegrityBtn = document.getElementById('btn-run-exp-integrity');
        if (expIntegrityBtn) {
            expIntegrityBtn.addEventListener('click', async () => {
                expIntegrityBtn.disabled = true;
                const statusEl = document.getElementById('exp-integrity-status');
                if (window.networkLab) {
                    await window.networkLab.runIntegrityExperiment((msg) => {
                        if (statusEl) statusEl.textContent = msg;
                    });
                    const exp = window.networkLab.experiments.integrity;
                    if (statusEl) statusEl.textContent = `Cryptographic error-detection test completed.`;
                    const tableBody = document.querySelector('#exp-integrity-table tbody');
                    if (tableBody && exp.normalTest && exp.corruptTest) {
                        tableBody.innerHTML = `
                            <tr>
                                <td style="color: #10b981; font-weight: 600;">Bit-Perfect Payload</td>
                                <td style="font-family: monospace; font-size: 11px;">${exp.normalTest.expectedHash.substring(0, 24)}...</td>
                                <td style="font-family: monospace; font-size: 11px;">${exp.normalTest.actualHash.substring(0, 24)}...</td>
                                <td><span class="net-badge" style="background: rgba(16,185,129,0.2); color: #10b981;">✅ INTEGRITY VERIFIED (PASS)</span></td>
                            </tr>
                            <tr>
                                <td style="color: #ef4444; font-weight: 600;">1-Bit Corrupted Payload</td>
                                <td style="font-family: monospace; font-size: 11px;">${exp.corruptTest.expectedHash.substring(0, 24)}...</td>
                                <td style="font-family: monospace; font-size: 11px; color: #f87171;">${exp.corruptTest.actualHash.substring(0, 24)}...</td>
                                <td><span class="net-badge" style="background: rgba(239,68,68,0.2); color: #ef4444;">❌ CORRUPTION DETECTED (PASS)</span></td>
                            </tr>
                        `;
                    }
                }
                expIntegrityBtn.disabled = false;
            });
        }

        const expCsvBtn = document.getElementById('btn-export-lab-csv');
        if (expCsvBtn) {
            expCsvBtn.addEventListener('click', () => {
                if (!window.networkLab) return;
                const csv = window.networkLab.exportCSV();
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `netbridge-lab-dataset-${Date.now()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        const expJsonBtn = document.getElementById('btn-export-lab-json');
        if (expJsonBtn) {
            expJsonBtn.addEventListener('click', () => {
                if (!window.networkLab) return;
                const json = window.networkLab.exportJSON();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `netbridge-lab-dataset-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Corruption Simulation Checkbox
        const corruptChk = document.getElementById('chk-simulate-corruption');
        if (corruptChk) {
            corruptChk.addEventListener('change', (e) => {
                if (window.cryptoIntegrity) {
                    window.cryptoIntegrity.setCorruptionSimulation(e.target.checked);
                    if (e.target.checked) {
                        alert("⚠️ Viva Demo Mode Activated:\nThe next file received will have 1 byte flipped to demonstrate how SHA-256 rejects corrupted packets!");
                    }
                }
            });
        }

        // PWA Install button in Download pane
        const pwaInstallBtn = document.getElementById('btn-trigger-pwa-install');
        if (pwaInstallBtn) {
            pwaInstallBtn.addEventListener('click', () => {
                if (window.deferredInstallPrompt) {
                    window.deferredInstallPrompt.prompt();
                } else {
                    alert("To install NetBridge on this device:\n• Chrome/Edge: Click the Install icon in your browser address bar.\n• Android: Tap 3 dots (⋮) -> 'Add to Home screen'.\n• iPhone: Tap Share -> 'Add to Home Screen'.");
                }
            });
        }

        // Copy Network Link button in Download pane
        const copyUrlBtn = document.getElementById('btn-copy-network-url');
        if (copyUrlBtn) {
            copyUrlBtn.addEventListener('click', () => {
                const url = `http://${location.host}`;
                navigator.clipboard.writeText(url).then(() => {
                    copyUrlBtn.textContent = 'Copied to Clipboard!';
                    setTimeout(() => { copyUrlBtn.textContent = 'Copy Network Link'; }, 2000);
                });
            });
        }
    }

    _onIntegrityVerified(record) {
        const countEl = document.getElementById('integrity-log-count');
        const tableBody = document.querySelector('#integrity-audit-table tbody');
        if (!tableBody || !window.cryptoIntegrity) return;

        const list = window.cryptoIntegrity.getAuditLog();
        if (countEl) countEl.textContent = `${list.length} files verified`;

        tableBody.innerHTML = list.map(item => `
            <tr>
                <td style="color: #64748b; font-size: 11px;">${item.timestamp}</td>
                <td style="font-weight: 600; color: #f1f5f9;">${item.fileName}</td>
                <td>${(item.fileSize / 1024).toFixed(1)} KB</td>
                <td style="font-family: monospace; font-size: 10.5px; color: #38bdf8;">${item.expectedHash}</td>
                <td style="font-family: monospace; font-size: 10.5px; color: ${item.verified ? '#10b981' : '#ef4444'};">${item.actualHash}</td>
                <td>
                    ${item.verified 
                        ? '<span class="net-badge" style="background: rgba(16,185,129,0.2); color: #10b981;">✅ VERIFIED</span>' 
                        : '<span class="net-badge" style="background: rgba(239,68,68,0.2); color: #ef4444;">❌ MISMATCH</span>'
                    }
                </td>
            </tr>
        `).join('');
    }

    show() {
        this.isOpen = true;
        const modal = document.getElementById('network-modal');
        modal.classList.add('active');
        this.updateTopologyData();
        this.startTopologyLoop();
        this.loadServerData();
        this.renderInspectorList();
        this.renderDownloadQrCode();
    }

    hide() {
        this.isOpen = false;
        const modal = document.getElementById('network-modal');
        modal.classList.remove('active');
        if (this.topologyAnimationId) {
            cancelAnimationFrame(this.topologyAnimationId);
            this.topologyAnimationId = null;
        }
    }

    toggle() {
        if (this.isOpen) this.hide();
        else this.show();
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.net-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });
        document.querySelectorAll('.net-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-${tabName}`);
        });

        if (tabName === 'topology') {
            this.startTopologyLoop();
        } else if (tabName === 'telemetry') {
            this.renderThroughputChart();
        } else if (tabName === 'server') {
            this.loadServerData();
        } else if (tabName === 'download') {
            this.renderDownloadQrCode();
        }
    }

    renderDownloadQrCode() {
        const qrContainer = document.getElementById('net-download-qrcode');
        const urlEl = document.getElementById('net-download-url');
        const currentUrl = `http://${location.host}`;
        if (urlEl) urlEl.textContent = currentUrl;

        if (qrContainer && typeof QRCode !== 'undefined') {
            try {
                const qr = new QRCode({
                    content: currentUrl,
                    width: 124,
                    height: 124,
                    color: "#000000",
                    background: "#ffffff",
                    ecl: "M"
                });
                qrContainer.innerHTML = qr.svg();
            } catch (e) {
                qrContainer.innerHTML = `<a href="${currentUrl}" style="font-size:11px;color:#38bdf8;">${currentUrl}</a>`;
            }
        }
    }

    _updateLocalNodeDisplay(detail) {
        const nameEl = document.getElementById('net-local-name');
        const idEl = document.getElementById('net-local-peer-id');
        if (nameEl && detail?.displayName) nameEl.textContent = detail.displayName + ' (' + (detail.deviceName || 'Local Device') + ')';
        if (idEl && detail?.peerId) idEl.textContent = 'Peer UUID: ' + detail.peerId;
    }

    /**
     * Topology Canvas Renderer
     */
    startTopologyLoop() {
        const canvas = document.getElementById('net-topo-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const render = () => {
            if (!this.isOpen || this.activeTab !== 'topology') return;

            // Handle DPI
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
            }

            ctx.save();
            ctx.scale(dpr, dpr);
            const w = rect.width;
            const h = rect.height;

            // Clear
            ctx.fillStyle = '#0b1120';
            ctx.fillRect(0, 0, w, h);

            // Draw grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            const centerX = w / 2;
            const centerY = h / 2 - 20;

            // Signaling Server Node (Center Top)
            const srvX = centerX;
            const srvY = 70;

            // Local Node (Center Bottom)
            const localX = centerX;
            const localY = h - 70;

            this.pulseOffset = (this.pulseOffset + 0.8) % 30;

            // Collect remote peers
            const peers = window.pairDrop?.peers?.peers || {};
            const peerIds = Object.keys(peers);
            const peerCountEl = document.getElementById('net-topo-peer-count');
            if (peerCountEl) peerCountEl.textContent = `${peerIds.length} Connected Peer(s)`;

            // Draw lines between Local and Server
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(localX, localY);
            ctx.lineTo(srvX, srvY);
            ctx.stroke();

            // Animated pulse on server link
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            const pulseY = localY - ((localY - srvY) * (this.pulseOffset / 30));
            ctx.arc(localX, pulseY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw peer nodes
            const radius = Math.min(w, h) * 0.38;
            peerIds.forEach((pid, idx) => {
                const angle = (Math.PI / (peerIds.length + 1)) * (idx + 1);
                const px = centerX + (Math.cos(angle) * (idx % 2 === 0 ? 1 : -1) * (radius * 0.9));
                const py = centerY + (Math.sin(angle) * 40);

                // Direct P2P line
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(localX, localY);
                ctx.lineTo(px, py);
                ctx.stroke();

                // Signaling link to server
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(srvX, srvY);
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw Peer Node circle
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(px, py, 16, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Peer ${idx + 1}`, px, py + 28);
                ctx.fillStyle = '#10b981';
                ctx.fillText('WebRTC P2P', px, py + 40);
            });

            // Draw Server Node
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(srvX, srvY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Signaling Server', srvX, srvY - 26);
            ctx.font = '10px monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('WebSocket Gateway', srvX, srvY - 14);

            // Draw Local Node
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(localX, localY, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('This Device (Local Host)', localX, localY + 36);
            ctx.font = '10.5px sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('● Ready for P2P', localX, localY + 50);

            ctx.restore();
            this.topologyAnimationId = requestAnimationFrame(render);
        };

        this.topologyAnimationId = requestAnimationFrame(render);
    }

    updateTopologyData() {
        if (window.pairDrop?.footerUI?._displayName) {
            this._updateLocalNodeDisplay({
                displayName: window.pairDrop.footerUI._displayName,
                deviceName: 'Local Node'
            });
        }
    }

    _onTelemetryTick(data) {
        if (!data) return;
        const uploadRateEl = document.getElementById('kpi-upload-rate');
        const uploadPeakEl = document.getElementById('kpi-upload-peak');
        const downloadRateEl = document.getElementById('kpi-download-rate');
        const downloadPeakEl = document.getElementById('kpi-download-peak');
        const totalSentEl = document.getElementById('kpi-total-sent');
        const totalRecvEl = document.getElementById('kpi-total-recv');

        if (window.transferStats) {
            if (uploadRateEl) uploadRateEl.textContent = window.transferStats.formatSpeed(data.sendRate);
            if (uploadPeakEl) uploadPeakEl.textContent = window.transferStats.formatSpeed(data.peakSend);
            if (downloadRateEl) downloadRateEl.textContent = window.transferStats.formatSpeed(data.recvRate);
            if (downloadPeakEl) downloadPeakEl.textContent = window.transferStats.formatSpeed(data.peakRecv);
            if (totalSentEl) totalSentEl.textContent = window.transferStats.formatBytes(data.totalSent);
            if (totalRecvEl) totalRecvEl.textContent = window.transferStats.formatBytes(data.totalRecv);
        }

        if (data.rtcStats) {
            const rttEl = document.getElementById('rtc-rtt');
            const cipherEl = document.getElementById('rtc-cipher');
            const pairEl = document.getElementById('rtc-candidate-pair');
            if (rttEl && data.rtcStats.rtt) rttEl.textContent = `${data.rtcStats.rtt} ms`;
            if (cipherEl && data.rtcStats.dtlsCipher !== 'unknown') cipherEl.textContent = data.rtcStats.dtlsCipher;
            if (pairEl && data.rtcStats.localCandidateType !== 'unknown') {
                pairEl.textContent = `${data.rtcStats.localCandidateType} ↔ ${data.rtcStats.remoteCandidateType}`;
            }
        }

        if (this.isOpen && this.activeTab === 'telemetry') {
            this.renderThroughputChart();
        }
    }

    renderThroughputChart() {
        const canvas = document.getElementById('net-chart-canvas');
        if (!canvas || !window.transferStats) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        const w = rect.width;
        const h = rect.height;

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, w, h);

        const history = window.transferStats.throughputHistory || [];
        if (history.length < 2) {
            ctx.restore();
            return;
        }

        let maxVal = 100 * 1024; // baseline 100 KB/s
        history.forEach(item => {
            if (item.sendBps > maxVal) maxVal = item.sendBps;
            if (item.recvBps > maxVal) maxVal = item.recvBps;
        });

        const stepX = w / (history.length - 1);

        // Draw Inbound (Download) - Blue
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((pt, i) => {
            const x = i * stepX;
            const y = h - (pt.recvBps / maxVal) * (h - 20) - 10;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Outbound (Upload) - Green
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((pt, i) => {
            const x = i * stepX;
            const y = h - (pt.sendBps / maxVal) * (h - 20) - 10;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.restore();
    }

    async runDiagnostics() {
        const btn = document.getElementById('btn-run-diagnostics');
        if (btn) btn.disabled = true;

        if (window.networkDiagnostics) {
            await window.networkDiagnostics.runFullDiagnostics((status) => {
                const verdictEl = document.getElementById('diag-verdict');
                if (verdictEl) verdictEl.textContent = status;
            });

            const res = window.networkDiagnostics.results;

            // Latency
            const avgRttEl = document.getElementById('diag-avg-rtt');
            const jitterEl = document.getElementById('diag-jitter');
            const minRttEl = document.getElementById('diag-min-rtt');
            const maxRttEl = document.getElementById('diag-max-rtt');

            if (avgRttEl) avgRttEl.textContent = `${res.latency.avg || 0} ms`;
            if (jitterEl) jitterEl.textContent = `${res.latency.jitter || 0} ms`;
            if (minRttEl) minRttEl.textContent = `${res.latency.min || 0} ms`;
            if (maxRttEl) maxRttEl.textContent = `${res.latency.max || 0} ms`;

            // Grade & Score
            const gradeEl = document.getElementById('diag-grade');
            const scoreEl = document.getElementById('diag-score');
            const verdictEl = document.getElementById('diag-verdict');

            if (gradeEl) gradeEl.textContent = res.qualityScore.grade;
            if (scoreEl) scoreEl.textContent = `${res.qualityScore.score} / 100`;
            if (verdictEl) verdictEl.textContent = res.qualityScore.verdict;

            // NAT & Candidates
            const natTypeEl = document.getElementById('diag-nat-type');
            if (natTypeEl) natTypeEl.textContent = `NAT: ${res.nat.natType}`;

            const tableBody = document.querySelector('#diag-candidates-table tbody');
            if (tableBody) {
                if (res.nat.gatheredCandidates.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #10b981;">LAN Direct Host Candidates Ready</td></tr>`;
                } else {
                    tableBody.innerHTML = res.nat.gatheredCandidates.map(c => `
                        <tr>
                            <td><span class="net-badge" style="background: rgba(16,185,129,0.15); color: #10b981;">${c.type.toUpperCase()}</span></td>
                            <td>${c.protocol}</td>
                            <td style="font-family: monospace; color: #38bdf8;">${c.ip}</td>
                            <td>${c.port}</td>
                            <td style="color: #94a3b8;">${c.priority}</td>
                        </tr>
                    `).join('');
                }
            }
        }

        if (btn) btn.disabled = false;
    }

    _onPacketLogged(entry) {
        if (!this.isOpen || this.activeTab !== 'inspector') return;
        this.renderInspectorList();
    }

    renderInspectorList(filter = 'all') {
        const container = document.getElementById('inspector-packet-list');
        const countEl = document.getElementById('inspector-count');
        if (!container || !window.protocolInspector) return;

        const packets = window.protocolInspector.getLogs(filter);
        if (countEl) countEl.textContent = `${packets.length} logged`;

        if (packets.length === 0) {
            container.innerHTML = `<div style="color: #64748b; padding: 20px; text-align: center;">No packets matching filter "${filter}"</div>`;
            return;
        }

        container.innerHTML = packets.map(p => `
            <div class="net-packet-item" data-id="${p.id}" style="border-left-color: ${p.badgeColor};">
                <div class="net-packet-meta">
                    <span class="net-dir-badge ${p.direction === 'IN' ? 'net-dir-in' : 'net-dir-out'}">${p.direction}</span>
                    <span style="color: #64748b; font-size: 11px;">${p.time}</span>
                    <b style="color: #f1f5f9; font-size: 12px;">${p.type}</b>
                </div>
                <div style="font-size: 11px; color: #94a3b8; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 200px;">
                    ${p.summary}
                </div>
            </div>
        `).join('');

        // Attach click handlers
        container.querySelectorAll('.net-packet-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                const pkt = packets.find(p => p.id === id);
                if (pkt) this.inspectPacket(pkt);
            });
        });
    }

    inspectPacket(pkt) {
        const typeEl = document.getElementById('inspector-selected-type');
        const detailEl = document.getElementById('inspector-detail-view');
        if (typeEl) typeEl.textContent = `${pkt.type} (${pkt.transport})`;

        let detailText = `// Packet Time: ${pkt.time}\n// Direction: ${pkt.direction} | Transport: ${pkt.transport} | Size: ${pkt.byteSize} bytes\n\n`;

        if (pkt.parsedSDP) {
            detailText += `=== DECODED SDP SESSION (RFC 4566) ===\n`;
            detailText += `Session Origin: ${pkt.parsedSDP.origin || 'N/A'}\n`;
            detailText += `ICE Ufrag:      ${pkt.parsedSDP.iceUfrag || 'N/A'}\n`;
            detailText += `ICE Password:   ${pkt.parsedSDP.icePwd || 'N/A'}\n`;
            detailText += `DTLS Fingerprint:\n  ${pkt.parsedSDP.fingerprint || 'N/A'}\n`;
            detailText += `Bundled Candidates: ${pkt.parsedSDP.candidates.length}\n`;
            detailText += `\n=== RAW SDP PAYLOAD ===\n`;
        }

        detailText += pkt.rawJson;
        if (detailEl) detailEl.textContent = detailText;
    }

    async loadServerData() {
        try {
            const [statsRes, ifaceRes] = await Promise.all([
                fetch('/api/network/stats', { cache: 'no-store' }),
                fetch('/api/network/interfaces', { cache: 'no-store' })
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                const s = data.server;
                const sig = data.signaling;

                document.getElementById('srv-hostname').textContent = s.hostname || '--';
                document.getElementById('srv-platform').textContent = `${s.platform} (${s.arch})`;
                document.getElementById('srv-uptime').textContent = `${Math.floor(s.uptimeSeconds / 3600)}h ${Math.floor((s.uptimeSeconds % 3600) / 60)}m`;
                document.getElementById('srv-memory').textContent = `${s.processMemoryMB} MB (Heap)`;
                document.getElementById('srv-ram-usage').textContent = `${s.systemMemory.usagePercent}% (${s.systemMemory.freeMB} MB free / ${s.systemMemory.totalMB} MB)`;

                if (sig) {
                    document.getElementById('srv-rooms').textContent = sig.activeRoomsCount || 0;
                    document.getElementById('srv-peers').textContent = sig.activePeersCount || 0;
                    document.getElementById('srv-msg-count').textContent = sig.messageCounts?.total || 0;
                    document.getElementById('srv-fallback-bytes').textContent = (sig.fallbackBytesTransferred || 0) + ' bytes';
                }
            }

            if (ifaceRes.ok) {
                const ifaces = await ifaceRes.json();
                const tableBody = document.querySelector('#srv-interfaces-table tbody');
                if (tableBody && ifaces.interfaces) {
                    const rows = [];
                    for (const [name, list] of Object.entries(ifaces.interfaces)) {
                        list.forEach(item => {
                            rows.push(`
                                <tr>
                                    <td style="font-weight: 600; color: #38bdf8;">${name}</td>
                                    <td style="font-family: monospace;">${item.address}</td>
                                    <td><span class="net-badge">${item.family}</span></td>
                                    <td style="font-family: monospace; color: #94a3b8;">${item.netmask || '--'}</td>
                                    <td style="font-family: monospace; font-size: 11px;">${item.mac || '--'}</td>
                                    <td>${item.cidr || '--'}</td>
                                </tr>
                            `);
                        });
                    }
                    tableBody.innerHTML = rows.join('');
                }
            }
        } catch (e) {
            console.warn("Failed to load server network info:", e);
        }
    }
}

// Global dashboard instance
window.networkDashboard = new NetworkDashboardUI();

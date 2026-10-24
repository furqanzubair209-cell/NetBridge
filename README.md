# NetBridge — Intelligent Peer-to-Peer File Sharing & Network Diagnostics System

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-RFC%208831-blue.svg)](https://www.w3.org/TR/webrtc/)
[![Protocol](https://img.shields.io/badge/Transport-SCTP%20%7C%20DTLS%20%7C%20UDP-orange.svg)](https://datatracker.ietf.org/)
[![Security](https://img.shields.io/badge/Integrity-SHA--256%20SubtleCrypto-purple.svg)](https://www.w3.org/TR/WebCryptoAPI/)

**NetBridge** is an advanced, production-grade Computer Networks semester project engineered to demonstrate, measure, and analyze real-world transport, signaling, NAT traversal, and cryptographic protocols. Built on top of WebRTC and WebSockets, NetBridge operates as both a functional zero-configuration peer-to-peer file transfer system (capable of operating fully offline over local area networks) and an academic network diagnostics laboratory.

---

## 📑 Table of Contents
- [1. Computer Networking Concepts Implemented](#1-computer-networking-concepts-implemented)
- [2. System Architecture](#2-system-architecture)
- [3. Protocol Specification & Sequence Flows](#3-protocol-specification--sequence-flows)
- [4. NAT Traversal & ICE Candidate Lifecycle](#4-nat-traversal--ice-candidate-lifecycle)
- [5. Cryptographic Integrity Verification](#5-cryptographic-integrity-verification)
- [6. The NetBridge Network Lab (Experiments)](#6-the-netbridge-network-lab-experiments)
- [7. Backend Network REST APIs](#7-backend-network-rest-apis)
- [8. Installation & Execution Guide (Windows)](#8-installation--execution-guide-windows)
- [9. University Viva & Defense Guide](#9-university-viva--defense-guide)

---

## 1. Computer Networking Concepts Implemented

NetBridge maps directly across the entire **OSI 7-Layer & TCP/IP Model**:

| OSI Layer | Protocol / Technology in NetBridge | Exact Academic Implementation |
|---|---|---|
| **Layer 7: Application** | HTTP/1.1, WebSocket, SDP, SHA-256 | Static Express server, full-duplex signaling gateway, RFC 4566 SDP parser, streaming SHA-256 digests. |
| **Layer 6: Presentation** | DTLS-SRTP, AEAD AES-128-GCM | Transparent browser-level DTLS encryption over SCTP; SHA-256 integrity verification. |
| **Layer 5: Session** | WebRTC Signaling State Machine | ICE connection states (`checking`, `connected`, `completed`), offer/answer handshake, room secret exchanges. |
| **Layer 4: Transport** | **SCTP (over DTLS/UDP)** & **TCP** | Stream Control Transmission Protocol for ordered, reliable data channels (`RTCDataChannel`); TCP for WebSocket signaling. |
| **Layer 3: Network** | IPv4, IPv6, ICMP, STUN | Subnet discovery (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), STUN Server Reflexive IP mapping (RFC 5389). |
| **Layer 2: Data Link** | Network Interface Cards (NICs), MACs | Server adapter inspection API exposing hardware MAC addresses, MTU thresholds, and CIDR masks. |

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NetBridge Architecture                          │
├─────────────────────────────────────┬──────────────────────────────────┤
│           Client Tier               │          Signaling Tier          │
│    (Vanilla ES6, HTML5, Canvas)     │     (Node.js + Express + ws)     │
├─────────────────────────────────────┼──────────────────────────────────┤
│ • main.js: App lifecycle & hydration │ • server.js: HTTP/REST static &  │
│ • network.js: WebRTC & WS protocols │   config server (/config, /ip)   │
│ • protocol-inspector.js: Frame log  │ • ws-server.js: Full-duplex WS   │
│ • transfer-stats.js: RTC Telemetry  │   signaling gateway              │
│ • crypto-integrity.js: SHA-256      │ • peer.js: Client model & subnet │
│ • network-lab.js: Scientific test   │   segmentation logic             │
│ • network-dashboard-ui.js: Console  │                                  │
└─────────────────────────────────────┴──────────────────────────────────┘
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
     WebRTC DataChannel (P2P)              WebSocket Fallback Relay
     • RFC 8831: SCTP over DTLS/UDP        • Base64 chunk proxy via
     • RFC 8445: ICE Candidate mesh          central signaling server
     • RFC 5389: STUN (Google default)     • Used when WebRTC is blocked
```

### Offline Local LAN Operation
Unlike cloud file-transfer utilities, **NetBridge does not require an active internet connection** to exchange files between devices on the same Wi-Fi router or Ethernet switch:
1. Devices connect to `http://<LAN_IP>:3000`.
2. The Node.js server detects that clients share a private IPv4 space (`192.168.x.x` or `10.x.x.x`) and groups them into the same local room.
3. WebRTC gathers local `host` ICE candidates containing their direct LAN IP addresses.
4. Direct SCTP data channels open peer-to-peer over the local router with zero internet bandwidth consumption.

---

## 3. Protocol Specification & Sequence Flows

### A. WebRTC P2P Signaling & Session Establishment
```
Peer A (Initiator)           Signaling Server (WebSocket)           Peer B (Receiver)
       │                                  │                                  │
       │─── 1. Connect (WS Handshake) ───▶│◀─── 1. Connect (WS Handshake) ───│
       │─── 2. { type: 'join-ip-room' } ─▶│                                  │
       │                                  │◀─── 2. { type: 'join-ip-room' } ─│
       │                                  │                                  │
       │◀── 3. { type: 'peer-joined' } ───│─── 3. { type: 'peers' } ────────▶│
       │                                  │                                  │
       │─── 4. SDP Offer (RFC 4566) ─────▶│─── 4. Relay SDP Offer ──────────▶│
       │                                  │                                  │
       │◀── 5. Relay SDP Answer ──────────│◀── 5. SDP Answer (RFC 4566) ─────│
       │                                  │                                  │
       │─── 6. Local ICE Candidates ─────▶│─── 6. Relay ICE Candidates ─────▶│
       │◀── 7. Relay ICE Candidates ──────│◀── 7. Remote ICE Candidates ─────│
       │                                  │                                  │
       │═════════════════════════════════════════════════════════════════════│
       │      8. P2P DTLS Handshake & SCTP DataChannel Established           │
       │═════════════════════════════════════════════════════════════════════│
```

### B. End-to-End File Transfer & Flow Control
```
Sender                                                                Receiver
  │                                                                      │
  │─── 1. Hash File (SHA-256: e3b0c44...) ─────────────────────────────▶ │
  │─── 2. Request Transfer { name, size, mime, sha256 } ───────────────▶ │
  │◀── 3. User Accepts Transfer { type: 'files-transfer-response' } ────│
  │                                                                      │
  │─── 4. Header Frame { name, size, mime } ───────────────────────────▶ │
  │─── 5. Binary Chunk (16 KB - 128 KB) ───────────────────────────────▶ │
  │─── 6. Binary Chunk (16 KB - 128 KB) ───────────────────────────────▶ │
  │─── 7. Partition Boundary Reached (1 MB) { type: 'partition' } ─────▶ │
  │◀── 8. Acknowledge Flow Window { type: 'partition-received' } ────────│
  │                                                                      │
  │─── 9. Final Chunk & Completion Signal ─────────────────────────────▶ │
  │                                                                      │
  │                                10. Receiver Computes Actual SHA-256  │
  │                                11. Compares Actual vs Expected Hash  │
  │◀── 12. Transfer Complete ACK { verified: true } ────────────────────│
```

---

## 4. NAT Traversal & ICE Candidate Lifecycle

Network Address Translators (NATs) assign private IP addresses inside local networks and translate them to shared public IPs on the internet. NetBridge uses **Interactive Connectivity Establishment (ICE, RFC 8445)** to establish direct connections through NAT firewalls:

1. **Host Candidates (`host`)**: Direct IP addresses bound to the device's physical/virtual network adapters (e.g., `192.168.1.15:54321` or `[fe80::...]:54321`). Ideal for zero-latency local LAN transfers.
2. **Server Reflexive Candidates (`srflx`)**: Discovered by sending UDP binding requests to public STUN servers (`stun:stun.l.google.com:19302`). STUN inspects the incoming packet header and replies with the public WAN IP and translated NAT port.
3. **Relay Candidates (`relay`)**: Used as a last resort when both peers reside behind strict **Symmetric NATs** (where port numbers change per destination IP). Data is proxied through a TURN relay server.

The NetBridge **Diagnostics Suite** inspects all harvested ICE candidates and outputs the NAT classification in real time.

---

## 5. Cryptographic Integrity Verification

To protect against transport-layer bit errors, packet truncations, or transmission corruptions, NetBridge implements **SHA-256 end-to-end cryptographic integrity verification**:

* **Hashing Algorithm**: SHA-256 (256-bit secure hash, FIPS 180-4) using the hardware-accelerated **Web Crypto API** (`crypto.subtle.digest`).
* **Workflow**:
  1. Sender hashes the entire file buffer before transmission: `Hash_expected = SHA256(File)`.
  2. The digest is transmitted as a 64-character hex string inside the transfer header.
  3. Receiver reassembles binary chunks into a unified Blob upon completion.
  4. Receiver independently hashes the assembled Blob: `Hash_actual = SHA256(ReceivedBlob)`.
  5. The transfer is confirmed only if `Hash_actual === Hash_expected`.
* **Viva Demonstration Mode**: The **Integrity Tab** contains an intentional "Simulate 1-Byte Corruption" toggle. When enabled, the receiver flips a single bit in the first received byte, demonstrating how SHA-256's avalanche property generates an entirely different hash and alerts the user of a failed integrity check.

---

## 6. The NetBridge Network Lab (Experiments)

Click the **Network Console** button (globe icon in the header) and navigate to the **🔬 Network Lab** tab to conduct repeatable, scientific networking experiments:

### Experiment 1: Round-Trip Latency & Jitter Variance (RFC 3393)
* **Objective**: Measure statistical delay variance over sequential packet probes.
* **Metrics**: Minimum RTT, Maximum RTT, Arithmetic Mean RTT, and Mean Absolute Deviation (Jitter).

### Experiment 2: Chunk Size vs SCTP Throughput Benchmark
* **Objective**: Evaluate application-layer framing efficiency and memory serialization.
* **Metrics**: Compares 16 KB, 64 KB, 128 KB, and 256 KB chunk sizes across a 10 MB synthetic buffer, recording elapsed time and effective MB/s throughput.

### Experiment 3: SHA-256 Error-Detection & Bit-Flip Demonstration
* **Objective**: Experimentally demonstrate the cryptographic avalanche effect and proving corruption detection over lossy or manipulated channels.

### Data Export:
Click **Export Lab Data (CSV)** to download an RFC-formatted dataset ready for inclusion in academic course reports, Excel charts, or semester presentation slides.

---

## 7. Backend Network REST APIs

NetBridge extends the Node.js backend with low-overhead operational networking endpoints:

* **`GET /api/network/ping?t=<timestamp>`**:
  High-precision RTT measurement endpoint. Returns server timestamp, client timestamp, and estimated round-trip latency in milliseconds.
* **`GET /api/network/interfaces`**:
  Extracts hardware Network Interface Cards (NICs) using Node's `os.networkInterfaces()`. Returns adapter names (Wi-Fi, Ethernet, Loopback), assigned IPv4 & IPv6 addresses, subnet netmasks, CIDR notation, and hardware MAC addresses.
* **`GET /api/network/stats`**:
  Reports real-time signaling telemetry: active WebSocket connections, active IP subnets, message counter breakdown (`signals`, `pings`, `roomEvents`, `fallbackChunks`), server uptime, and system RAM utilization.

---

## 8. Installation & Execution Guide (Windows)

### Prerequisites:
- [Node.js](https://nodejs.org/) v18.0.0 or higher.
- A modern web browser supporting WebRTC (Chrome, Edge, Firefox, Brave, Safari).

### Step-by-Step Run Instructions:

1. **Open PowerShell or Command Prompt** in the project directory:
   ```cmd
   cd "e:\Program Files\PairDrop"
   ```

2. **Install Dependencies** (if not already installed):
   ```cmd
   cmd.exe /c "npm install"
   ```

3. **Start NetBridge**:
   ```cmd
   node server/index.js
   ```

4. **Access the Application**:
   - Open your browser at: `http://localhost:3000`
   - To connect from another phone, tablet, or laptop on your Wi-Fi network, check your local IP using `ipconfig` (e.g. `http://192.168.1.50:3000`).

5. **Open Network Console**:
   - Click the **Network Console** button (globe icon in the top header) to open the multi-tab diagnostics dashboard, inspect active connections, and run experiments.

---

## 9. University Viva & Defense Guide

### Q1: What transport protocol does NetBridge use for file transfer, and why?
**Answer**: NetBridge uses **SCTP (Stream Control Transmission Protocol)** encapsulated over **DTLS (Datagram Transport Layer Security)** over **UDP** (RFC 8831 WebRTC Data Channels). Unlike raw TCP, SCTP allows multi-streaming without head-of-line blocking, while maintaining configurable reliability and ordered delivery. UDP ensures low latency and avoids TCP connection setup overhead.

### Q2: What is the purpose of the WebSocket server if the file transfer is peer-to-peer?
**Answer**: WebRTC requires a preliminary out-of-band communication channel called **Signaling** to discover peers. Browsers do not know each other's IP addresses, listening ports, or codec configurations initially. The WebSocket server acts as an intermediary to exchange **SDP (Session Description Protocol)** offers/answers and **ICE candidates**. Once the direct P2P data channel is opened, file transfer occurs directly between browsers, bypassing the signaling server completely.

### Q3: How does NetBridge discover devices on the same local network?
**Answer**: During the WebSocket handshake, the server examines the client's socket remote IP address (`req.socket.remoteAddress` or proxy headers). If the IP belongs to a private RFC 1918 range (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), the server groups all peers into a common LAN room (`127.0.0.1`). Devices immediately receive a `peers` broadcast listing all other nodes on that subnet.

### Q4: Why is a STUN server needed? What happens if both peers are behind Symmetric NAT?
**Answer**: Devices behind a NAT router only know their private LAN IP (e.g., `192.168.1.15`). A **STUN** server (RFC 5389) sends back the peer's public WAN IP and NAT-mapped port so it can share it with remote peers. However, if both peers are behind a **Symmetric NAT**, the router assigns a different external port for every unique destination IP, making direct hole punching impossible. In this scenario, NetBridge detects ICE gathering failure and automatically transitions to **WebSocket Relay Fallback**.

### Q5: What is the difference between encryption and file integrity in NetBridge?
**Answer**: Encryption (provided by **DTLS-SRTP** using AES-128-GCM) guarantees **confidentiality**—eavesdroppers cannot read data traveling across intermediate switches. **File integrity** (provided by **SHA-256**) guarantees **correctness**—it mathematically proves that not a single bit of the file was corrupted, truncated, or dropped during chunk reassembly.

---

## 📜 License & Academic Attribution
Licensed under the ISC License. Originally derived from the PairDrop/Snapdrop open-source projects, redesigned and engineered into **NetBridge** as a Computer Networks university-level demonstration system.

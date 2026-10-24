import express from "express";
import RateLimit from "express-rate-limit";
import {fileURLToPath} from "url";
import path, {dirname} from "path";
import http from "http";
import os from "os";

export default class PairDropServer {

    constructor(conf) {
        const app = express();
        this.wsServer = null;

        if (conf.rateLimit) {
            const limiter = RateLimit({
                windowMs: 5 * 60 * 1000, // 5 minutes
                max: 1000, // Limit each IP to 1000 requests per `window` (here, per 5 minutes)
                message: 'Too many requests from this IP Address, please try again after 5 minutes.',
                standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
                legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            })

            app.use(limiter);
            app.set('trust proxy', conf.rateLimit);

            if (!conf.debugMode) {
                console.log("Use DEBUG_MODE=true to find correct number for RATE_LIMIT.");
            }
        }

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const publicPathAbs = path.join(__dirname, '../public');
        app.use(express.static(publicPathAbs));

        if (conf.debugMode && conf.rateLimit) {
            console.debug("\n");
            console.debug("----DEBUG RATE_LIMIT----")
            console.debug("To find out the correct value for RATE_LIMIT go to '/ip' and ensure the returned IP-address is the IP-address of your client.")
            app.get('/ip', (req, res) => {
                res.send(req.ip);
            })
        }

        // Configuration endpoint
        app.get('/config', (req, res) => {
            res.send({
                signalingServer: conf.signalingServer,
                buttons: conf.buttons,
                projectName: "NetBridge",
                version: "2.0.0-pro"
            });
        });

        // ==========================================
        // ADVANCED NETWORKING REST API
        // ==========================================

        // High precision ping / RTT measurement endpoint
        app.get('/api/network/ping', (req, res) => {
            const now = Date.now();
            const clientTimestamp = req.query.t ? parseInt(req.query.t, 10) : null;
            res.json({
                pong: true,
                serverTimestamp: now,
                clientTimestamp: clientTimestamp,
                rttMs: clientTimestamp ? (now - clientTimestamp) : null
            });
        });

        // Network interfaces / IP configuration
        app.get('/api/network/interfaces', (req, res) => {
            const interfaces = os.networkInterfaces();
            const result = {};
            for (const [name, infos] of Object.entries(interfaces)) {
                if (infos) {
                    result[name] = infos.map(info => ({
                        address: info.address,
                        netmask: info.netmask,
                        family: info.family,
                        mac: info.mac,
                        internal: info.internal,
                        cidr: info.cidr
                    }));
                }
            }
            res.json({
                hostname: os.hostname(),
                interfaces: result,
                timestamp: Date.now()
            });
        });

        // Real-time server and signaling telemetry
        app.get('/api/network/stats', (req, res) => {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const memUsage = ((1 - freeMem / totalMem) * 100).toFixed(1);

            const signalingStats = this.wsServer ? this.wsServer.getStats() : {
                status: "Standalone Signaling"
            };

            res.json({
                server: {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    arch: os.arch(),
                    uptimeSeconds: Math.floor(os.uptime()),
                    systemMemory: {
                        totalMB: Math.round(totalMem / (1024 * 1024)),
                        freeMB: Math.round(freeMem / (1024 * 1024)),
                        usagePercent: parseFloat(memUsage)
                    },
                    nodeUptime: Math.floor(process.uptime()),
                    processMemoryMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024))
                },
                signaling: signalingStats,
                timestamp: Date.now()
            });
        });

        app.get('/', (req, res) => {
            res.sendFile(path.join(publicPathAbs, 'index.html'));
        });

        app.use((req, res) => {
            res.redirect(301, '/');
        });

        const hostname = conf.localhostOnly ? '127.0.0.1' : null;
        const server = http.createServer(app);

        server.listen(conf.port, hostname);

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(err);
                console.info("Error EADDRINUSE received, exiting process without restarting process...");
                process.exit(1)
            }
        });

        this.server = server
    }
}
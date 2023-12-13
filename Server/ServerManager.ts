
import * as os from "os";
import * as timers from "timers";
import { RequestHandler, ServerRequest } from "./Common";

export class ServerManager extends RequestHandler {
    static updateInterval = 5000;
    static recordCount = 360;
    private statistics: ServerStatistics = {
        upTime: os.uptime(),
        loadHistory: [],
        cpuHistory: [],
        memoryHistory: []
    };
    private lastCPUData: os.CpuInfo[] = os.cpus();
    private lastUpdate: number = new Date().getTime();

    constructor() {
        super();
        timers.setInterval(() => {
            this.updateStatistics();
        }, ServerManager.updateInterval);
    }

    public getRoutes(): { [k: string]: ServerRequest; } {
        var routeMap: { [k: string]: ServerRequest } = {};
        routeMap["server/getStatistics"] = () => this.getServerStatistics();
        return routeMap;
    }

    private async getServerStatistics() {
        return this.statistics;
    }

    private updateStatistics() {
        this.statistics.upTime = os.uptime();
        this.populateLoad();
        this.populateCPU();
        this.populateMemory();
        if (this.statistics.loadHistory.length > ServerManager.recordCount) {
            this.statistics.loadHistory.pop();
            this.statistics.memoryHistory.pop();
            this.statistics.cpuHistory.pop();
        }
    };
    private populateLoad() {
        var load = os.loadavg();
        this.statistics.loadHistory.unshift({
            timeStamp: new Date().getTime(),
            one: load[0],
            five: load[1],
            fifteen: load[2]
        });
    }

    private populateCPU() {
        var cpuData = os.cpus();
        var updateTime = new Date().getTime();
        var period = updateTime - this.lastUpdate;
        var tickData: TickData = {
            timeStamp: new Date().getTime(),
            CPUSpeed: [],
            idle: [],
            system: [],
            user: []
        };
        for (var i = 0; i < cpuData.length; i++) {
            var currentData = cpuData[i];
            var lastData = this.lastCPUData[i];
            var idleTime = (currentData.times.idle - lastData.times.idle) / 10;
            var userTime = (currentData.times.user - lastData.times.user) / 10;
            var sysTime = ((currentData.times.sys + currentData.times.irq + currentData.times.nice) - (lastData.times.sys + lastData.times.nice + lastData.times.irq)) / 10;
            tickData.idle[i] = (idleTime / period) * 100;
            tickData.user[i] = (userTime / period) * 100;
            tickData.system[i] = (sysTime / period) * 100;
            tickData.CPUSpeed[i] = currentData.speed;
        }
        this.statistics.cpuHistory.unshift(tickData);
        this.lastUpdate = updateTime;
        this.lastCPUData = cpuData;
    }

    private populateMemory() {
        this.statistics.memoryHistory.unshift({
            timeStamp: new Date().getTime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem()
        });
    }
}

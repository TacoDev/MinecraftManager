import * as fs from "fs";
import { MinecraftPing } from "./MinecraftPing";
import { BlueMapConfig, BlueMapWorldConfig, MinecraftConfig, RequestHandler, ServerRequest, WorldSettings, getMinecraftConfig, handleSpawnedProcess, minecraftBlueMapWorldConfigs, usedSlots } from "./Common";

const portSlotMap: { [key in Slots]: Ports } = {
    "slot1": "25565",
    "slot2": "25566",
    "slot3": "25567",
    "none": "25565"
};

const eulaText = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).
#Wed Mar 03 19:11:24 PST 2021
eula=true`;
const opsJson = `[]`;
const worldProperties: MinecraftProperties = {
    "enable-jmx-monitoring": "false",
    "verify-names": "true",
    "rcon.port": "25575",
    "level-seed": "",
    "enable-command-block": "false",
    "gamemode": "survival",
    "enable-query": "true",
    "generator-settings": "{}",
    "enforce-secure-profile": "true",
    "level-name": "world",
    "motd": "Tacos Server",
    "query.port": "25565",
    "pvp": "true",
    "texture-pack": "",
    "generate-structures": "true",
    "max-chained-neighbor-updates": "1000000",
    "difficulty": "hard",
    "network-compression-threshold": "256",
    "max-tick-time": "60000",
    "require-resource-pack": "false",
    "use-native-transport": "true",
    "max-players": "20",
    "online-mode": "true",
    "enable-status": "true",
    "allow-flight": "false",
    "broadcast-rcon-to-ops": "true",
    "view-distance": "10",
    "max-build-height": "256",
    "server-ip": "",
    "resource-pack-prompt": "",
    "allow-nether": "true",
    "server-port": "25565",
    "enable-rcon": "true",
    "sync-chunk-writes": "true",
    "op-permission-level": "2",
    "prevent-proxy-connections": "false",
    "hide-online-players": "false",
    "resource-pack": "",
    "entity-broadcast-range-percentage": "100",
    "simulation-distance": "10",
    "player-idle-timeout": "30",
    "rcon.password": "",
    "force-gamemode": "true",
    "rate-limit": "0",
    "hardcore": "false",
    "white-list": "false",
    "broadcast-console-to-ops": "true",
    "spawn-npcs": "true",
    "previews-chat": "false",
    "spawn-animals": "true",
    "snooper-enabled": "true",
    "function-permission-level": "2",
    "level-type": "default",
    "text-filtering-config": "",
    "spawn-monsters": "true",
    "enforce-whitelist": "false",
    "spawn-protection": "0",
    "resource-pack-sha1": "",
    "max-world-size": "29999984"
}

async function delay(timeMs: number) {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, Math.min(timeMs, 5000));
    })
}

interface newWorldOptions {
    worldName: string;
    hardcore?: boolean;
    gameMode?: MinecraftProperties["gamemode"];
    difficulty?: MinecraftProperties["difficulty"];
}

export class MinecraftManager extends RequestHandler {
    static manager = new MinecraftManager();
    static mapPathPrefix = "maps/";
    static mapIconPath = "/screenshot.png";
    static hostName = "taco.dyndns.info";

    public static getInstance() {
        return this.manager;
    }

    private constructor() {
        super();
    }

    public getRoutes(): { [k: string]: ServerRequest } {
        const routeMap: { [k: string]: ServerRequest } = {};
        routeMap["manager/listWorlds"] = () => this.getMinecraftWorlds();
        routeMap["manager/switchWorlds"] = postData => this.switchWorldSlot(postData);
        routeMap["manager/stopSlot"] = (slot: Slots) => this.stopMinecraftServer(slot);
        routeMap["manager/startSlot"] = (slot: Slots) => this.startMinecraftServer(slot);
        routeMap["manager/createWorld"] = (options: newWorldOptions) => this.createWorld(options);
        return routeMap;
    }

    private async createWorld(options: newWorldOptions) {
        const worldCount = this.getWorldList().length;
        if (worldCount > 40) {
            throw Error("Only 40 worlds supported, contact admin");
        }
        if (!options.worldName.match(/^[a-zA-Z0-9]+$/g)) {
            throw Error("Name can only contain letters and numbers");
        }
        const currentConfig = getMinecraftConfig();
        const worldDirectory = `${currentConfig.minecraftWorldDirectory}${options.worldName}`;
        try {
            fs.mkdirSync(worldDirectory);
            fs.writeFileSync(`${worldDirectory}/eula.txt`, eulaText);
            fs.writeFileSync(`${worldDirectory}/ops.json`, opsJson);
            this.updateModt(worldProperties, options.worldName, "none");
            worldProperties.difficulty = options.difficulty ?? "normal";
            worldProperties.gamemode = options.gameMode ?? "survival";
            if (options.hardcore) {
                worldProperties.hardcore = "true";
            }
            this.writeWorldProperties(options.worldName, worldProperties);
            fs.chownSync(worldDirectory, 111, 117);
            fs.chownSync(`${worldDirectory}/eula.txt`, 111, 117);
            fs.chownSync(`${worldDirectory}/ops.json`, 111, 117);
            fs.chownSync(`${worldDirectory}/server.properties`, 111, 117);
        } catch (e) {
            console.log(`Failed to create ${e}`);
        }
        return this.getMinecraftWorlds();
    }

    public async getMinecraftWorlds() {
        const minecraftConfig = getMinecraftConfig();
        const allWorldsData = this.getWorldList();
        const pingDataRequest = usedSlots.map(async (slot) => {
            const worldData = allWorldsData.find(world => world.slot === slot);
            try {
                const slotData = await MinecraftPing.pingJava({
                    host: MinecraftManager.hostName,
                    port: parseInt(portSlotMap[slot])
                });
                if (worldData) {
                    worldData.worldStats = slotData;
                }
            } catch (e: any) {
                if ((e as Error).message.includes("Ping Timeout")) {
                    if (worldData) {
                        worldData.starting = this.isWorldStarting(`${minecraftConfig.minecraftWorldDirectory}${minecraftConfig[slot]}/logs/latest.log`);
                    }
                } else {
                    console.log(e);
                }
            }
        });
        // Promies.allSettled not it server version of nodeJS, this is work around
        for (const request of pingDataRequest) {
            try {
                await request;
            } catch (e) { }
        }
        return allWorldsData;
    }

    private getWorldList(): WorldDataConfig[] {
        const minecraftConfig = getMinecraftConfig();
        const allWorlds = fs.readdirSync(minecraftConfig.minecraftWorldDirectory);
        const allWorldsData = allWorlds.map<WorldDataConfig>((world) => {
            let x = 0, y = 0;
            try {
                const overworldSettings = JSON.parse(fs.readFileSync(`${minecraftConfig.minecraftMapDirectory}${world}/maps/overworld/settings.json`).toString()) as WorldSettings;
                x = overworldSettings.startPos[0];
                y = overworldSettings.startPos[1];
            } catch (e) {
                console.log(`${world} has not been rendered`);
            }
            return {
                slot: "none",
                name: world,
                iconPath: MinecraftManager.mapPathPrefix + world + MinecraftManager.mapIconPath,
                mapLink: `${MinecraftManager.mapPathPrefix}${world}#overworld:${x}:50:${y}:100:-0.36:0.72:0:0:perspective}`,
                serverProperties: this.readWorldProperties(world),
                worldStats: null as any,
                starting: false
            };
        });
        usedSlots.forEach(slot => {
            const world = allWorldsData.find(world => world.name === minecraftConfig[slot]);
            if (world) {
                world.slot = slot;
            }
        });
        return allWorldsData;
    }

    private isWorldStarting(logPath: string): boolean {
        if (fs.existsSync(logPath)) {
            const logFile = fs.readFileSync(logPath, { encoding: "utf8" });
            const startLog = logFile.indexOf("[Server thread/INFO]: Starting Minecraft server");
            const completLog = logFile.indexOf("[Server thread/INFO]: Done", startLog);
            const stopping = logFile.indexOf("[Server thread/INFO]: Stopping server", startLog);
            const exception = logFile.indexOf("[Server thread/ERROR]: Encountered an unexpected exception", startLog);
            return (startLog !== -1 && completLog === -1) && stopping === -1 && exception === -1;
        }
        return false;
    }

    private hasWorldStopped(logPath: string): boolean {
        if (fs.existsSync(logPath)) {
            const logFile = fs.readFileSync(logPath, { encoding: "utf8" });
            const startLog = logFile.indexOf("[Server thread/INFO]: Thread Query Listener stopped");
            return (startLog !== -1);
        }
        return false;
    }

    private async switchWorldSlot(postData: SwapRequest) {
        const currentConfig = getMinecraftConfig();
        const currentWorldData = await this.getMinecraftWorlds();
        const oldWorldConfig = currentWorldData.find(world => world.name === currentConfig[postData.slot]) || null;
        const newWorldConfig = currentWorldData.find(world => world.name === postData.world) || null;
        // Make sure old world is not being played on, and new world is not running, and not in one of the slots already
        if (oldWorldConfig?.worldStats && oldWorldConfig.worldStats.numPlayers !== 0) {
            throw Error(`${postData.slot} is currently in use`);
        }
        if (newWorldConfig?.worldStats && !newWorldConfig?.starting) {
            throw Error(`${postData.world} is already running`);
        }
        if (usedSlots.some(slot => currentConfig[slot] === postData.world)) {
            throw Error(`${postData.world} is already in another slot`);
        }
        await this.stopMinecraftServer(postData.slot);
        fs.writeFileSync(`${currentConfig.minecraftWorldDirectory}../${postData.slot}`, postData.world);
        this.generateBlueMapConfigs(postData.world, postData.slot);
        await this.startMinecraftServer(postData.slot);
        return this.getMinecraftWorlds();
    }

    private async stopMinecraftServer(slot: Slots) {
        await handleSpawnedProcess("systemctl", ["stop", `minecraft${slot}`]);
        const minecraftConfig = getMinecraftConfig();
        // wait for the server to completely stop
        while (!this.hasWorldStopped(`${minecraftConfig.minecraftWorldDirectory}${minecraftConfig[slot]}/logs/latest.log`)) {
            // Handle case the server crashed
            const worlds = await this.getMinecraftWorlds();
            const stoppedSlot = worlds.find(world => world.slot === slot);
            if (!(stoppedSlot?.worldStats)) {
                break;
            }
            await delay(1500);
        }
        return this.getMinecraftWorlds();
    }

    private async startMinecraftServer(slot: Slots) {
        const currentConfig = getMinecraftConfig();
        const worldName = currentConfig[slot];
        const serverProperties = this.readWorldProperties(worldName);
        serverProperties["server-port"] = portSlotMap[slot];
        serverProperties["query.port"] = portSlotMap[slot];
        serverProperties["enable-query"] = "true";
        serverProperties["enable-rcon"] = "false";
        this.updateModt(serverProperties, worldName, slot);
        this.writeWorldProperties(worldName, serverProperties);
        await handleSpawnedProcess("systemctl", ["start", `minecraft${slot}`]);
        let delayTime = 0;
        let returnValue: WorldDataConfig[];
        let startedSlot: WorldDataConfig | undefined;
        do {
            await delay(delayTime);
            returnValue = await this.getMinecraftWorlds();
            startedSlot = returnValue.find(world => world.slot === slot);
            delayTime = 1000;
        } while (!(startedSlot?.worldStats) && !(startedSlot?.starting));
        return returnValue;
    }

    private updateModt(properties: MinecraftProperties, worldName: string, slot: Slots) {
        properties.motd = `${worldName}-Taco Server (${slot})`
    }


    private readWorldProperties(worldName: string): MinecraftProperties {
        const currentConfig = getMinecraftConfig();
        const propertiesPath = `${currentConfig.minecraftWorldDirectory}${worldName}/server.properties`;
        const serverProperties: MinecraftProperties = {} as MinecraftProperties;
        if (fs.existsSync(propertiesPath)) {
            const propertiesFile = fs.readFileSync(propertiesPath, { encoding: "utf8" });
            const propertiesLines = propertiesFile.split("\n");
            for (let _i = 0, propertiesLines_1 = propertiesLines; _i < propertiesLines_1.length; _i++) {
                const line = propertiesLines_1[_i];
                if (line.indexOf("=") !== -1) {
                    const pairValue = line.split("=");
                    const key = pairValue[0].trim() as keyof MinecraftProperties;
                    (serverProperties[key] as any) = pairValue[1].trim();
                }
            }
        }
        return serverProperties;
    }

    private writeWorldProperties(worldName: string, serverProperties: MinecraftProperties) {
        const currentConfig = getMinecraftConfig();
        let newFileText = "";
        for (const propertyName in serverProperties) {
            newFileText = newFileText + propertyName + "=" + serverProperties[propertyName as keyof MinecraftProperties] + "\n";
        }
        fs.writeFileSync(`${currentConfig.minecraftWorldDirectory}${worldName}/server.properties`, newFileText);
    }

    private generateBlueMapConfigs(worldName: string, slotName: Slots) {
        const currentConfig = getMinecraftConfig();
        const dimensions: Dimensions[] = ["overworld", "nether", "end"];
        dimensions.forEach((dimension) => {
            const { name, world } = this.getBlueMapNameAndWorld(worldName, dimension, currentConfig);
            currentConfig.blueMapConfig.name = name;
            currentConfig.blueMapConfig.world = world;
            this.writeBlueMapWorldSettings(currentConfig.blueMapConfig, slotName, dimension)
        });
        fs.writeFileSync(`${minecraftBlueMapWorldConfigs}${slotName}/core.conf`,
            `accept-download: true
data: "data"
render-thread-count: -1
scan-for-mod-resources: false
metrics: true
log: {
  file: "data/logs/debug.log"
  append: false
}`);
        fs.writeFileSync(`${minecraftBlueMapWorldConfigs}${slotName}/webapp.conf`,
            `enabled: true
webroot: "${currentConfig.minecraftMapDirectory}${worldName}"
update-settings-file: true
use-cookies: true
enable-free-flight: true
default-to-flat-view: false
min-zoom-distance: 5
max-zoom-distance: 100000
resolution-default: 1
hires-slider-max: 500
hires-slider-default: 100
hires-slider-min: 0
lowres-slider-max: 7000
lowres-slider-default: 2000
lowres-slider-min: 500
scripts: []
styles: []`);
        fs.writeFileSync(`${minecraftBlueMapWorldConfigs}${slotName}/storages/file.conf`,
            `storage-type: FILE
root: "${currentConfig.minecraftMapDirectory}${worldName}/maps"
compression: GZIP`);
        fs.writeFileSync(`${minecraftBlueMapWorldConfigs}${slotName}/webserver.conf`,
            `enabled: false
webroot: "${currentConfig.minecraftMapDirectory}${worldName}"
port: 8100
log: {
    file: "data/logs/webserver.log"
    append: false
    format: "%1$s \\"%3$s %4$s %5$s\\" %6$s %7$s"
}`);
    }

    private writeBlueMapWorldSettings(blueMapConfig: BlueMapConfig, slotName: Slots, dimension: Dimensions,) {
        const worldConfigDefaults = blueMapConfig[dimension];
        let propertyName: keyof BlueMapConfig;
        let newFileText = "";
        const settingsMap: { [id: string]: string } = {};
        let defaultProperty: keyof BlueMapWorldConfig;
        for (defaultProperty in worldConfigDefaults) {
            settingsMap[defaultProperty] = worldConfigDefaults[defaultProperty];
        }
        for (propertyName in blueMapConfig) {
            if (propertyName === "overworld" || propertyName === "nether" || propertyName === "end") {
                continue;
            }
            const filteredPropertyName = propertyName as keyof BlueMapWorldConfig;
            const settingValue = worldConfigDefaults[filteredPropertyName] ?? blueMapConfig[filteredPropertyName];
            settingsMap[filteredPropertyName] = settingValue
        }
        for (const settingName in settingsMap) {
            newFileText += `${settingName}: ${JSON.stringify(settingsMap[settingName])}\n`;
        }
        fs.writeFileSync(`${minecraftBlueMapWorldConfigs}${slotName}/maps/${dimension}.conf`, newFileText);
    }

    private getBlueMapNameAndWorld(worldName: string, dimension: Dimensions, config: MinecraftConfig) {
        const defaultValues = { name: worldName, world: `${config.minecraftWorldDirectory}${worldName}/world` };
        if (dimension === "nether") {
            defaultValues.name = `${defaultValues.name} (Nether)`;
            defaultValues.world = `${defaultValues.world}/DIM-1`;
        }
        if (dimension === "end") {
            defaultValues.name = `${defaultValues.name} (End)`;
            defaultValues.world = `${defaultValues.world}/DIM1`;
        }
        return defaultValues;
    }
}
import { MinecraftManager } from "./MinecraftManager";
import * as fs from "fs";
import * as http from "http";
import { WorldSettings, getMinecraftConfig, handleSpawnedProcess, minecraftBlueMapWorldConfigs, usedSlots } from "./Common";

const serverJarPath = getMinecraftConfig().minecraftJarPath;
const manifestUrl = getMinecraftConfig().minecraftManifestUrl;
const blueMapJarPath = getMinecraftConfig().blueMapJarPath;

interface MinecraftManifest {
    latest: {
        release: string;
        snapshot: string;
    };
    versions: {
        id: string;
        type: "release" | "snapshot";
        url: string;
        time: string;
        releaseTime: string;
    }[];
}

interface MinecraftDownloadData {
    sha1: string;
    size: number;
    url: string;
}

interface MinecraftPackage {
    id: string;
    type: "release" | "snapshot";
    downloads: {
        client: MinecraftDownloadData;
        server: MinecraftDownloadData;
        clinet_mappings: MinecraftDownloadData;
        server_mappints: MinecraftDownloadData;
    };
}

const oneMinute = 1000 * 60;
const halfAnHour = oneMinute * 30;

let backgroundRunning = false;
let restartWhenCan = false;
let rendering = false;

export namespace BackgroundTasks {

    async function backgroundTasks() {
        updateVersionIfNeeded();
        await restartSlotsIfPossible();
        void renderBlueMap();
    }

    export async function StartupBrackgroundTasks() {
        if (backgroundRunning) {
            return;
        }
        backgroundRunning = true;
        setTimeout(() => { 
            console.log("Starting background tasks");
            backgroundTasks();
        }, 5000)
        setInterval(() => {
            try {
                backgroundTasks();
            } catch (e) {
                console.log(e);
            }
        }, halfAnHour);
    }

    export async function getActiveWorlds(onlyInUse = false) {
        const manager = MinecraftManager.getInstance();
        const activeWorlds = (await manager.getMinecraftWorlds()).filter(world => world.slot !== "none");
        if (!onlyInUse) {
            return activeWorlds;
        }
        return activeWorlds.filter(world => world.worldStats?.numPlayers ?? 0);
    }

    async function restartSlotsIfPossible() {
        if (restartWhenCan) {
            const inUse = await getActiveWorlds(true);
            if (inUse.length === 0) {
                restartWhenCan = false;
                usedSlots.forEach(async (slot) => {
                    await handleSpawnedProcess("systemctl", ["restart", `minecraft${slot}`]);
                });
            }
        }
    }

    async function requestDocument<T>(url: string, destination?: string): Promise<T | void> {
        return new Promise<T | void>((respond, erred) => {
            http.get(url, (res) => {
                const { statusCode } = res;
                const contentType = res.headers['content-type'] ?? "";

                let error;
                // Any 2xx status code signals a successful response but
                // here we're only checking for 200.
                if (statusCode !== 200) {
                    error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
                }

                if (destination) {
                    const file = fs.createWriteStream(destination);
                    res.pipe(file);
                    file.on("finish", function () {
                        file.close();
                        respond();
                    });
                    return;
                } else if (!/^application\/json/.test(contentType)) {
                    error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
                }
                if (error) {
                    erred(error.message);
                    // Consume response data to free up memory
                    res.resume();
                    return;
                }

                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    try {
                        if (!destination) {
                            respond(JSON.parse(rawData));
                        }
                    } catch (e) {
                        erred(e);
                    }
                });
            }).on('error', (e) => {
                erred(`Got error: ${e.message}`);
            });
        });
    }

    async function updateVersionIfNeeded() {
        const activeWorlds = await getActiveWorlds();
        const currentVersion = activeWorlds[0].worldStats?.gameVersion ?? "";
        console.log(`Current version ${currentVersion}`);
        if (!currentVersion) {
            return;
        }
        // Get latest release version from manifest
        const manifest = await requestDocument<MinecraftManifest>(manifestUrl);
        if (!manifest) {
            return;
        }
        console.log(`Latest version ${manifest.latest.release}`);
        if (currentVersion !== manifest.latest.release) {
            console.log(`Updating minecraft jar to ${manifest.latest.release}`);
            const versionInfo = manifest.versions.find((version) => version.id === manifest.latest.release);
            if (!versionInfo) {
                return;
            }
            const packageData = await requestDocument<MinecraftPackage>(versionInfo.url.replace("https:", "http:"));
            if (!packageData) {
                return;
            }
            await requestDocument<MinecraftPackage>(packageData.downloads.server.url.replace("https:", "http:"), serverJarPath);
            await handleSpawnedProcess("chmod", [`+x`, serverJarPath]);
            restartWhenCan = true;
            restartSlotsIfPossible();
        }
    }

    async function renderBlueMap() {
        if (rendering) {
            return;
        }
        console.log(`Starting to render bluemaps`);
        const usedWorlds = await getActiveWorlds();
        rendering = true;
        try {
            // Foreach will make this run in parallel, don't want to overload the CPU so run sync
            for (var i = 0; i < usedWorlds.length; i++) {
                console.log(`Starting to render ${usedWorlds[i].slot}`);
                try {
                    await handleSpawnedProcess("java",
                        [
                            "-jar",
                            blueMapJarPath,
                            `-c`,
                            `${minecraftBlueMapWorldConfigs}${usedWorlds[i].slot}`,
                            `-r`
                        ]);
                    await updateScreenShot(usedWorlds[i].name);
                } catch (e) {
                    console.log(`Failed to update map ${e}`);
                }
            }
        } catch (e) {
            console.log(e);
        } finally {
            rendering = false;
        }
    }

    async function updateScreenShot(worldName: string) {
        const config = getMinecraftConfig();
        try {
            const overworldSettings = JSON.parse(fs.readFileSync(`${config.minecraftMapDirectory}${worldName}/maps/overworld/settings.json`).toString()) as WorldSettings;
            fs.chownSync(`${config.minecraftMapDirectory}${worldName}`, 1000, 1000);
            const files = fs.readdirSync(`${config.minecraftMapDirectory}${worldName}/assets`);
            const favicon = files.find(file => file.startsWith("favicon"));
            fs.copyFileSync(`${config.minecraftMapDirectory}../favicon.ico`, `${config.minecraftMapDirectory}${worldName}/assets/${favicon}`)
            await handleSpawnedProcess("/usr/bin/chromium-browser", [
                "--headless=new",
                "--timeout=20000",
                `--hide-scrollbars`,
                `--disable-cache`,
                `-screenshot="${config.minecraftMapDirectory}${worldName}/screenshot.png"`,
                `"http://taco.dyndns.info/maps/${worldName}/#overworld:${overworldSettings.startPos[0]}:50:${overworldSettings.startPos[1]}:100:-0.36:0.72:0:0:perspective"`
            ], 1000);
        } catch (e) {
            console.log(`Failed to update screenshot ${e}`);
        }
    }

}
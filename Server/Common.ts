import * as fs from "fs";
import * as child_process from "child_process";
export type ParameterServerRequest = (request: any) => Promise<any>;
export type NoParameterServerRequest = () => Promise<any>;
export type ServerRequest = ParameterServerRequest | NoParameterServerRequest;

export type MinecraftConfig = {
    [key in Slots]: string;
} & {
    minecraftWorldDirectory: string;
    minecraftMapDirectory: string;
    blueMapConfigDirectory: string;
    blueMapConfig: BlueMapConfig;
    minecraftManifestUrl: string;
    minecraftJarPath: string;
    blueMapJarPath: string;
    chromeExePath: string;
};

export type BlueMapConfig = BlueMapWorldConfig & {
    [key in Dimensions]: BlueMapWorldConfig
}

export interface BlueMapWorldConfig {
    name: string,
    world: string,
    "remove-caves-below-y": number,
    "cave-detection-ocean-floor": number,
    "cave-detection-uses-block-light": boolean,
    "render-edges": boolean,
    "save-hires-layer": boolean,
    "storage": "file" | "sql",
    "ignore-missing-light-data": boolean,
    "min-inhabited-time": number,
    "marker-sets": any,
    "sky-color": string,
    "void-color": string,
    "ambient-light": number,
    "world-sky-light": number
}

type Coords = [number, number];
type Size = [number, number];

export interface WorldSettings {
    name: string;
    sorting: number;
    hires: {
        tileSize: Size;
        scale: Size;
        translate: Size;
    },
    lowres: {
        tileSize: Size;
        lodFactor: number;
        lodCount: number;
    }
    startPos: Coords;
    skyColor: [number, number, number, number];
    voidColor: [number, number, number, number];
    ambientLight: number;
}

const minecraftConfigPath = "./config.json";
// TODO this list should be dynamic based on the server it is running on, and sent to the client
export const usedSlots: Slots[] = ["slot1", "slot2", "slot3"];
export const minecraftBlueMapWorldConfigs = getMinecraftConfig().blueMapConfigDirectory;

export abstract class RequestHandler {
    abstract getRoutes(): { [k: string]: ServerRequest }
}

export function getMinecraftConfig(): MinecraftConfig {
    const minecraftConfig = JSON.parse(fs.readFileSync(minecraftConfigPath, { encoding: "utf8" }));
    usedSlots.forEach(slot => {
        minecraftConfig[slot] = fs.readFileSync(`${minecraftConfig.minecraftWorldDirectory}../${slot}`).toString();
    });
    return minecraftConfig;
}

export function handleSpawnedProcess(command: string, args?: readonly string[], asUser?: number) {
    console.log(`Attempting command "${command} ${args?.join(" ")}"`)
    return new Promise<void>((resolve, reject) => {
        const process = child_process.exec(`${command} ${args?.join(" ")}`, { uid: asUser });
        /*process.stdout?.setEncoding('utf8');
        process.stdout?.on('data', function (data) {
            console.log(`stdout: ${data}`);
        });

        process.stderr?.setEncoding('utf8');
        process.stderr?.on('data', function (data) {
            console.log(`stderr: ${data}`);
        });*/

        process.on("exit", () => {
            if (process.exitCode === 0) {
                resolve();
            } else {
                reject("Child exec failed");
            }
        });
    });
}

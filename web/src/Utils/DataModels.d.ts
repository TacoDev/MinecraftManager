type Slots = "slot1" | "slot2" | "slot3" | "none";
type Ports = "25565" | "25566" | "25567";
type Dimensions = "overworld" | "nether" | "end";

interface MinecraftProperties {
  "enable-jmx-monitoring": "true" | "false";
  "verify-names": "true" | "false";
  "rcon.port": string; // number
  "level-seed": string; // number
  "enable-command-block": "true" | "false";
  "gamemode": "survival" | "creative" | "adventure";
  "enable-query": "true" | "false";
  "generator-settings": string;
  "enforce-secure-profile": "true" | "false";
  "level-name": string;
  "motd": string;
  "query.port": Ports;
  "pvp": "true" | "false";
  "texture-pack": string;
  "generate-structures": "true" | "false";
  "max-chained-neighbor-updates": string; // number
  "difficulty": "hard" | "normal" | "easy" | "peaceful";
  "network-compression-threshold": string; // number
  "max-tick-time": string; // number
  "require-resource-pack": "true" | "false";
  "use-native-transport": "true" | "false";
  "max-players": string; // number
  "online-mode": "true" | "false";
  "enable-status": "true" | "false";
  "allow-flight": "true" | "false";
  "broadcast-rcon-to-ops": "true" | "false";
  "view-distance": string; // number
  "max-build-height": string; // number
  "server-ip": string;
  "resource-pack-prompt": string;
  "allow-nether": "true" | "false";
  "server-port": Ports;
  "enable-rcon": "true" | "false";
  "sync-chunk-writes": "true" | "false";
  "op-permission-level": string; // number
  "prevent-proxy-connections": "true" | "false";
  "hide-online-players": "true" | "false";
  "resource-pack": string;
  "entity-broadcast-range-percentage": string; // number
  "simulation-distance": string; // number
  "player-idle-timeout": string; // number
  "rcon.password": string;
  "force-gamemode": "true" | "false";
  "rate-limit": string; // number
  "hardcore": "true" | "false";
  "white-list": "true" | "false";
  "broadcast-console-to-ops": "true" | "false";
  "spawn-npcs": "true" | "false";
  "previews-chat": "true" | "false";
  "spawn-animals": "true" | "false";
  "snooper-enabled": "true" | "false";
  "function-permission-level": string; // number
  "level-type": "minecraft\:normal" | "minecraft\:flat" | "minecraft\:amplified" | "minecraft\:single_biome_surface" | "default";
  "text-filtering-config": string;
  "spawn-monsters": "true" | "false";
  "enforce-whitelist": "true" | "false";
  "spawn-protection": string; // number
  "resource-pack-sha1": string;
  "max-world-size": string; // number
}

interface WorldDataConfig {
  slot: Slots;
  name: string;
  iconPath: string;
  mapLink: string;
  serverProperties: MinecraftProperties;
  worldStats: PingResponse | null;
  starting: boolean;
}

interface SlotData {
  slotName: Slots;
  players: PingResponse["players"];
  hardcore: boolean;
  difficulty: MinecraftProperties["difficulty"]
  starting: boolean;
}

interface ServerData {
  updating: Slots;
  slotData: SlotData[]
}

interface PingResponse {
  motd: string;
  numPlayers: number;
  maxPlayers: number;
  host: string;
  port: number;
  gameVersion: string;
  worldHeight: number,
  gameType: string;
  gameName: string;
  plugins: string;
  defaultWorld: string;
  players: string[];
}

type ServerCall = () => Promise<{ data: any, type: "WorldData" | "none" }>;
type HandleCall = (serverCall: ServerCall) => Promise<void>;

interface TickData {
  timeStamp: number,
  CPUSpeed: number[],
  idle: number[],
  system: number[],
  user: number[]
}
interface HistoryData {
  timeStamp: number,
  one: number,
  five: number,
  fifteen: number
}
interface MemoryData {
  timeStamp: number,
  totalMemory: number,
  freeMemory: number
}

interface ServerStatistics {
  upTime: number;
  loadHistory: HistoryData[];
  cpuHistory: TickData[];
  memoryHistory: MemoryData[];
}

// Server request types
interface SwapRequest {
  slot: Slots,
  world: string
}
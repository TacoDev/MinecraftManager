
export default class ServerCom {
  static async getWorlds(): Promise<WorldDataConfig[]> {
    return await makeCall<WorldDataConfig[]>("manager/listWorlds") ?? [];
  }

  static async getStatistics(): Promise<ServerStatistics> {
    return await makeCall<ServerStatistics>("server/getStatistics") ?? [];
  }

  static async switchWorlds(slotName: Slots, world: string): Promise<WorldDataConfig[]> {
    return makeCall<WorldDataConfig[]>("manager/switchWorlds", {
      slot: slotName, world: world
    }) ?? [];
  }
  
  static async createWorld(worldName: string, hardcore: boolean, difficulty: MinecraftProperties["difficulty"]): Promise<WorldDataConfig[]> {
    return makeCall<WorldDataConfig[]>("manager/createWorld", {
      worldName: worldName, hardcore: hardcore, difficulty: difficulty
    }) ?? [];
  }
  
  static async startSlot(slotName: Slots): Promise<WorldDataConfig[]> {
    return makeCall<WorldDataConfig[]>("manager/startSlot", slotName) ?? [];
  }

  static async stopSlot(slotName: Slots): Promise<WorldDataConfig[]> {
    return makeCall<WorldDataConfig[]>("manager/stopSlot", slotName) ?? [];
  }
}

let id = 100;
async function makeCall<T>(route: string, parameters?: any): Promise<T> {
  const response = await fetch("/api/", {
    method: "POST",
    headers: [['Content-type', 'application/x-www-form-urlencoded']],
    body: `ps=${encodeURIComponent(JSON.stringify({
      id: `${++id}`,
      r: route,
      p: parameters ?? null,
      ts: new Date().getTime()
    }))}`
  });
  if (response.ok) {
    return (await response.json()).response;
  }
  throw Error(response.statusText);
}
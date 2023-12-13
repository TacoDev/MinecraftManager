import React from 'react';
import AdminBar from './AdminBar';
import './App.css';
import Graphs from './Graphs';
import SlotView from './SlotView';
import ServerCalls from './Utils/ServerCalls';
import WorldView from './WorldView';

const allSlots: Slots[] = ["slot1", "slot2", "slot3"];
let worlds: WorldDataConfig[] = [];
let timer: any = null;
let firstCall = true;

async function updateWorldData(redraw: () => void) {
  if (firstCall) {
    firstCall = false;
    processWorldData(await ServerCalls.getWorlds(), redraw);
  }
  if (timer === null) {
    timer = setInterval(async () => {
      processWorldData(await ServerCalls.getWorlds(), redraw);
    }, 10000);
  }
}

function processWorldData(newWorldData: WorldDataConfig[], redraw: () => void) {
  serverData.slotData.splice(0, serverData.slotData.length);
  worlds = newWorldData;
  worlds.forEach(world => {
    if (world.slot !== "none") {
      serverData.slotData.push({
        slotName: world.slot,
        players: world.worldStats?.players || [] as string[],
        difficulty: world.serverProperties.difficulty,
        hardcore: world.serverProperties.hardcore === "true",
        starting: world.starting
      });
    }
  });
  serverData.slotData.sort((a, b) => a.slotName.localeCompare(b.slotName));
  redraw();
}

let serverData: ServerData = {
  updating: "none",
  slotData: []
}


function App() {

  const [, updateState] = React.useState();
  const useForceUpdate = React.useCallback(() => updateState({} as any), []);

  const handleServerCall = React.useCallback<HandleCall>((serverCall) => {
    const response = serverCall().then((response) => {
      if (response.type === "WorldData") {
        processWorldData(response.data, useForceUpdate);
      }
      useForceUpdate();
    });
    useForceUpdate();
    return response;
  }, []);

  React.useEffect(() => {
    updateWorldData(() => {
      useForceUpdate();
    });
    return () => {
      timer = null;
      clearInterval(timer);
    };
  }, []);

  const slotWorlds: any[] = [];
  allSlots.forEach(slot => {
    const slotWorld = worlds.find(world => world.slot === slot)
    const row = (
      <SlotView key={slotWorld?.name ?? slot} world={slotWorld} serverData={serverData} handleServerCall={handleServerCall} />
    );
    slotWorlds.push(row);
  });
  const allWorlds = [];
  for (let world of worlds) {
    if (world.slot === "none") {
      const row = (
        <WorldView key={world.name} world={world} serverData={serverData} handleServerCall={handleServerCall} />
      );
      allWorlds.push(row);
    }
  }

  return (
    <div>
      <AdminBar worlds={worlds.map(world => world.name)} handleServerCall={handleServerCall} />
      <div className="slot_container">
        {slotWorlds}
      </div>
      <div className="world_container">
        {allWorlds}
      </div>
      <Graphs />
    </div>
  );
}

export default App;

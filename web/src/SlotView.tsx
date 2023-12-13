import './SlotView.css';
import { IconButton } from '@fluentui/react';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { Spinner } from '@fluentui/react/lib/Spinner';
import ServerCalls from "./Utils/ServerCalls";
initializeIcons();

function swapMapImage(worldName: string) {
  const mapLink = document.getElementById(`${worldName}_link`) as HTMLAnchorElement;
  const image = document.getElementById(`${worldName}_map_image`) as HTMLImageElement;
  const failedImage = document.getElementById(`${worldName}_failed_image`) as HTMLImageElement;
  if (image && failedImage && mapLink) {
    mapLink.style.cursor = "default";
    mapLink.onclick = () => false;
    image.style.display = "none";
    failedImage.style.display = "block";
  }
}

export default function SlotView(props: { world?: WorldDataConfig, serverData: ServerData, handleServerCall: HandleCall }) {
  const { world, serverData, handleServerCall } = props;
  const slotName = world?.slot ?? "none";
  if (!world) {
    return (
      <div className={"selectable"}>
        No running slot!
      </div >
    );
  }

  let button = <IconButton className="action_button" iconProps={{ iconName: "Play" }} label={"Start"} disabled={serverData.updating !== "none"} onClick={() => {
    handleServerCall(async () => {
      serverData.updating = world.slot;
      try {
        const returnData = await ServerCalls.startSlot(world.slot);
        serverData.updating = "none";
        return {
          data: returnData,
          type: "WorldData"
        };
      } catch (e) {
      }
      serverData.updating = "none";
      return {
        data: null,
        type: "none"
      };
    });
  }} />
  if (serverData.updating === slotName || world.starting) {
    button = <Spinner className='action_button'></Spinner>
  } else if (world.worldStats) {
    button = <IconButton className="action_button" iconProps={{ iconName: "Stop" }} label={"Stop"} disabled={serverData.updating !== "none" || world.worldStats.numPlayers > 0} onClick={() => {
      handleServerCall(async () => {
        serverData.updating = world.slot;
        try {
          const returnData = await ServerCalls.stopSlot(world.slot);
          serverData.updating = "none";
          return {
            data: returnData,
            type: "WorldData"
          };
        } catch (e) {
        }
        return {
          data: null,
          type: "none"
        };
      });
    }} />
  }

  return (
    <div className="single_slot">
      <div className="slot_header"><span className="slot_header_text">{world.name}{world.serverProperties.hardcore === "true" && <span className="hardcore_slot_label"> - Hardcore</span>}</span>{button}</div>
      <div className="slot_content">
        <div className="left_side">
          <div className="world_properties">
            <div className="property_label">Difficulty:</div>
            <div className="property_value">{world.serverProperties.difficulty}</div>
            {world.worldStats && <div className="property_label">Url:</div>}
            {world.worldStats && <div className="property_value">http://taco.dyndns.info:{world.worldStats?.port ?? ""}</div>}
            {world.worldStats && <div className="property_label">Version:</div>}
            {world.worldStats && <div className="property_value">{world.worldStats?.gameVersion ?? "unknown"}</div>}
            {world.worldStats && <div className="property_label">Player count:</div>}
            {world.worldStats && <div className="property_value">{world.worldStats?.players.length ?? 0}</div>}
            {world.worldStats && world.worldStats.players.length > 0 && <div className="property_label">Players on:</div>}
            {world.worldStats && world.worldStats.players.length > 0 && <div className="property_value">{world.worldStats?.players.join(", ")}</div>}
          </div>
        </div>
        <div className="right_side">
          <a id={`${world.name}_link`} href={world.mapLink} target={"_blank"}>
            <img id={`${world.name}_map_image`} className="slot_image" src={"http://taco.dyndns.info/" + world.iconPath} onError={() => swapMapImage(world.name)} title={"Overviewer map"}></img>
            <img id={`${world.name}_failed_image`} className="slot_image_failed" style={{ display: "none" }} title={"No overviewer map"} ></img>
          </a>
        </div>
      </div>
    </div >
  );
}

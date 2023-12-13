import './WorldView.css';
import { CommandButton, IContextualMenuProps } from '@fluentui/react';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
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

export default function WorldView(props: { world: WorldDataConfig, serverData: ServerData, handleServerCall: HandleCall }) {
  const { world, serverData, handleServerCall } = props;
  const menuProps: IContextualMenuProps = {
    items: []
  }
  serverData.slotData.forEach((slotData) => {
    menuProps.items.push({
      key: slotData.slotName,
      text: slotData.slotName,
      disabled: slotData.players.length > 0 || serverData.updating !== "none" || slotData.starting,
      iconProps: { iconName: 'Game' },
      onClick: () => {
        handleServerCall(async () => {
          serverData.updating = slotData.slotName;
          try {
            const newWorldData = await ServerCalls.switchWorlds(slotData.slotName, world.name);
            serverData.updating = "none";
            return {
              data: newWorldData,
              type: "WorldData"
            };
          } catch (e) { }
          serverData.updating = "none";
          return {
            data: null,
            type: "none"
          };
        });
      }
    })
  });

  return (
    <div className="single_world">
      <div className="world_left_side">
        <CommandButton
          className="world_header"
          text={world.name}
          split
          splitButtonAriaLabel="Move to Slot"
          aria-roledescription="select slot for world"
          menuProps={menuProps}
        />
        {world.serverProperties.hardcore === "true" && <div className="hardcore_label">Hardcore</div>}
        <div className="world_properties">
          <div className="property_label">Difficulty:</div>
          <div className="property_value">{world.serverProperties.difficulty}</div>
        </div>

      </div>
      <div className="world_right_side">
        <a id={`${world.name}_link`} className="world_link" href={world.mapLink} target={"_blank"}>
          <img id={`${world.name}_map_image`} className="world_image" src={"http://taco.dyndns.info/" + world.iconPath} onError={() => swapMapImage(world.name)} title={"Overviewer map"}></img>
          <img id={`${world.name}_failed_image`} className="world_image_failed" style={{ display: "none" }} title={"No overviewer map"} ></img>
        </a>
      </div>
    </div >
  );
}

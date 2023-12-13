import { useBoolean } from '@fluentui/react-hooks';
import './AdminBar.css';
import { PrimaryButton, DefaultButton, Dialog, DialogFooter, DialogType, Dropdown, IDropdownOption, TextField } from '@fluentui/react';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import ServerCalls from './Utils/ServerCalls';
import React from 'react';
initializeIcons();

function createWorld(handleServerCall: HandleCall, name: string, hardcore: boolean, difficulty: MinecraftProperties["difficulty"]) {
  handleServerCall(async () => {
    try {
      return {
        data: await ServerCalls.createWorld(name, hardcore, difficulty),
        type: "WorldData"
      };
    } catch (e) {
    }
    return {
      data: null,
      type: "none"
    };
  });
}

const modelProps = {
  isBlocking: false,
  topOffsetFixed: true,
};

const dialogContentProps = {
  type: DialogType.largeHeader,
  title: 'Create New World',
  subText: 'Enter in world name, and select difficulty',
};

interface DifficultDropDown extends IDropdownOption {
  key: MinecraftProperties["difficulty"] | "hardcore";
}

let options: DifficultDropDown[] = [
  { key: 'peaceful', text: 'Peaceful' },
  { key: 'easy', text: 'Easy' },
  { key: 'normal', text: 'Normal', selected: true },
  { key: 'hard', text: 'Hard' },
  { key: 'hardcore', text: 'Hardcore' }
];

function validateName(worldName: string, existingWorlds: string[]): string {
  if (worldName.match(/\s/g)) {
    return "Name cannot contain spaces";
  }
  if (!worldName.match(/^[a-zA-Z0-9]+$/g)) {
    return "Name can only contain letters and numbers";
  }
  if (existingWorlds.some(world => world.toLowerCase() === worldName.toLowerCase())) {
    return "World already exists";
  }
  if (worldName.length > 32) {
    return "Cannot be over 32 letters";
  }
  if (worldName.length < 5 && worldName.length > 0) {
    return "Must be at least 5 letters long";
  }
  return "";
}

export default function AdminBar(props: { worlds: string[], handleServerCall: HandleCall }) {
  const [hideDialog, { toggle: toggleHideDialog }] = useBoolean(true);
  const [validationMessage, setValidationMessage] = React.useState("");
  const [worldName, setWorldName] = React.useState("");
  const [worldDifficulty, setWorldDifficulty] = React.useState<DifficultDropDown["key"]>("normal");

  const worldNameChanged = React.useCallback((_e: any, newValue: string = "") => {
    setValidationMessage(validateName(newValue, props.worlds));
    setWorldName(newValue);
  }, [props.worlds]);

  const difficultyChanged = React.useCallback((_e: any, option?: DifficultDropDown, index?: number) => {
    if (!option) {
      return;
    }
    setWorldDifficulty(option?.key);
  }, []);
  
  const createOpened = React.useCallback(async () => {
    setWorldName("");
    setValidationMessage("");
    setWorldDifficulty("normal");
    toggleHideDialog();
  }, []);

  const createClicked = React.useCallback(async () => {
    const isHardcore = worldDifficulty === "hardcore";
    await createWorld(props.handleServerCall, worldName, isHardcore, isHardcore ? "hard" : worldDifficulty);
    toggleHideDialog();
  }, [worldName, worldDifficulty]);

  const disabled = worldName.length === 0 || validationMessage.length > 0;

  return (
    <><PrimaryButton disabled={props.worlds.length > 40} className='create_world' iconProps={{ iconName: "Add" }} text={"Create World"} onClick={createOpened} />
      <Dialog
        hidden={hideDialog}
        onDismiss={toggleHideDialog}
        dialogContentProps={dialogContentProps}
        modalProps={modelProps}
      >
        <TextField label="World Name" onChange={worldNameChanged} errorMessage={validationMessage} value={worldName} />
        <Dropdown
          placeholder="Select difficulty"
          label="Difficulty"
          options={options}
          onChange={difficultyChanged as any}
        />
        <DialogFooter>
          <PrimaryButton onClick={createClicked} disabled={disabled} text="Create" />
          <DefaultButton onClick={toggleHideDialog} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </>)
}
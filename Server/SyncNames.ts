import * as fs from "fs";
import * as child_process from "child_process";

namespace Server {
    export function start() {
        var world = process.argv[2];
        console.log("Updating players in world " + world);
        new UserUpdater(world);
        return 0;
    }
}

class UserUpdater {

    private world: string;
    private worldDirectory: string;
    private index: number;
    private userCache: any;

    constructor(world: string) {
        this.world = world;
        this.worldDirectory = `../../worlds/${this.world}/world`;
        this.index = 0;
        this.userCache = JSON.parse(fs.readFileSync(`../../worlds/${this.world}/usercache.json`, { encoding: "utf8" }));
        process.stdin.on('data', (inBuffer: Buffer) => {
            let text = inBuffer.toString('utf8');
            process.stdin.pause();
            text = text.trim();
            if (text.indexOf("s") !== -1) {
                console.log('Skipping user: ' + this.userCache[this.index].name);
                this.index++;
            }
            if (text.indexOf("exit") !== -1) {
                return;
            }
            else if (text.length === 36) {
                console.log('Processing user: ' + this.userCache[this.index].name);
                this.processUser(this.userCache[this.index].uuid, text);
                console.log('Complete for user: ' + this.userCache[this.index].name);
                console.log('');
                this.index++;
            }
            else {
                console.log('Check input: ' + text + " is not valid");
            }
            this.requestNextUser();
        });
        this.requestNextUser();
    }

    private requestNextUser() {
        if (this.index < this.userCache.length) {
            this.getNextUser(this.userCache[this.index]);
        }
    }

    private getNextUser(user: { name: string }) {
        child_process.exec('"C:\\Program\ Files\ (x86)\\Google\\Chrome\\Application\\chrome.exe" https://namemc.com/profile/' + user.name);
        console.log('Pass uuid for: ' + user.name + ', or s for skip');
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
    }

    private processUser(oldGuid: string, newGuid: string) {
        this.copyFile(this.worldDirectory + "/advancements/" + oldGuid + ".json", this.worldDirectory + "/advancements/" + newGuid + ".json");
        this.copyFile(this.worldDirectory + "/stats/" + oldGuid + ".json", this.worldDirectory + "/stats/" + newGuid + ".json");
        this.copyFile(this.worldDirectory + "/playerdata/" + oldGuid + ".dat", this.worldDirectory + "/playerdata/" + newGuid + ".dat");
    }

    private copyFile(oldPath: string, newPath: string) {
        if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
            fs.copyFileSync(oldPath, newPath);
        }
    }
}
Server.start();
const Path = require('path')
const { promises: Fs } = require('fs')

async function renameFilesInDir(dirName) {
    const allFiles = await Fs.readdir(dirName);
    const allRenames = [];
    allFiles.forEach(async (fileName) => {
        const newName = removeStartNumber(fileName);
        if (newName !== fileName) {
            allRenames.push(Fs.rename(Path.join(dirName, fileName), Path.join(dirName, newName)));
        }
    });
    await Promise.all(allRenames);
    console.log("Done");
}

function removeStartNumber(fileName) {
    return fileName.replace(/^\d{3}\./, "");
}

renameFilesInDir("D:\\RG351P-Original\\snes");
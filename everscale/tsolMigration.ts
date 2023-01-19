import * as fs from "fs";
import path from "path";

const main = () => {
  const pathToProject = path.resolve("/Users/pavlovdog/Work/bridge-contracts/everscale/contracts/");
  renameRecursively(pathToProject);
};

const renameRecursively = (pathToFolder: string) => {
  fs.readdirSync(pathToFolder).forEach((folderOrFile) => {
    const isFolder = !folderOrFile.split(".")[1];
    const pathToEntity = path.join(pathToFolder, folderOrFile);
    if (isFolder) {
      return renameRecursively(pathToEntity);
    }
    const oldContentContent = fs.readFileSync(pathToEntity, "utf-8");
    const imports = oldContentContent.match(/import ("|')(.*)("|');/g);
    debugger;
    if (imports) {
      const newContent = imports.reduce((acc, newImport) => {
        const nextImport = newImport.split("'").join('"');
        debugger;
        const importWithNewExt = nextImport
          .split('.sol";')
          .map((el, idx) => (idx === 1 ? '.tsol";' : el))
          .join("");
        return acc.replace(newImport, importWithNewExt);
      }, oldContentContent);

      fs.writeFileSync(pathToEntity, newContent);
    }
    if (pathToEntity.endsWith(".sol")) {
      fs.renameSync(pathToEntity, pathToEntity.replace(".sol", ".tsol"));
    }
  });
};

main();

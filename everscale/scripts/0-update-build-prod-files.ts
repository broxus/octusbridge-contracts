import { copyFileSync, readdirSync } from 'fs';

const main = async () => {
    const dirContent = readdirSync(process.cwd() + '/build');

    dirContent.forEach((file) => copyFileSync(`${process.cwd()}/build/${file}`, `${process.cwd()}/build_prod/${file}`));
};

main().then(() => console.log('Success'));

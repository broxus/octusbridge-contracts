const main = async () => {
    await locklift.deployments.load();

    [...Object.entries(locklift.deployments.deploymentsStore)]
        .map((a) => ({ name: a[0], address: (a[1] as any).address.toString() }))
        .forEach((b) => console.log(b.name + ': ```' + b.address + '```\n'));

};

main();

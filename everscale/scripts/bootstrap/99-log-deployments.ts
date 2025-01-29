const main = async () => {
    await locklift.deployments.load();

    const entries = [...Object.entries(locklift.deployments.deploymentsStore)]
        .map((a) => ({ name: a[0], address: (a[1] as any).address.toString() }));

    console.table(entries);
};

main();

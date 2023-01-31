async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryIncreaseTime(ms: number) {
    // @ts-ignore
    if (locklift.testing.isEnabled) {
        await locklift.testing.increaseTime(ms / 1000);
    } else {
        await sleep(ms);
    }
}

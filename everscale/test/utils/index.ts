const isValidTonAddress = (address: string) =>
    /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);

export const stringToBytesArray = (dataString: string) => {
    return Buffer.from(dataString).toString("base64");
};

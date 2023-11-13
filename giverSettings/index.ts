import {Address, Contract, Giver, ProviderRpcClient, Transaction} from "locklift";
import {Ed25519KeyPair} from "nekoton-wasm";

const giverWallet = {
    "ABI version": 2,
    header: ["pubkey", "time", "expire"],
    functions: [
        {
            name: "sendTransaction",
            inputs: [
                { name: "dest", type: "address" },
                { name: "value", type: "uint128" },
                { name: "bounce", type: "bool" },
                { name: "flags", type: "uint8" },
                { name: "payload", type: "cell" },
            ],
            outputs: [],
        },
    ],
    events: [],
} as const;
export class TestnetGiver implements Giver {
    public giverContract: Contract<typeof testnetGiverAbi>;

    constructor(ever: ProviderRpcClient, readonly keyPair: Ed25519KeyPair, address: string) {
        const giverAddr = new Address(address);
        this.giverContract = new ever.Contract(testnetGiverAbi, giverAddr);
    }

    public async sendTo(sendTo: Address, value: string): Promise<{ transaction: Transaction; output?: {} }> {
        return this.giverContract.methods
            .sendGrams({
                dest: sendTo,
                amount: value,
            })
            .sendExternal({ publicKey: this.keyPair.publicKey });
    }
}

const testnetGiverAbi = {
    "ABI version": 2,
    header: ["pubkey", "time", "expire"],
    functions: [
        {
            name: "sendGrams",
            inputs: [
                { name: "dest", type: "address" },
                { name: "amount", type: "uint64" },
            ],
            outputs: [],
        },
    ],
    events: [],
} as const;
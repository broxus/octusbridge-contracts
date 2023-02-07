import {Address} from "locklift";
import _ from "underscore";


class MetricManager {
    contracts: [{ name: string; address: Address }];
    checkpoints: { [key: string]: number[] };

    constructor(...contracts: [{ name: string; address: Address }]) {
        this.contracts = contracts;
        this.checkpoints = {};
    }

    lastCheckPointName() {
        return Object.keys(this.checkpoints).pop();
    }

    async checkPoint(name: string) {
        const balances: number[] = await Promise.all(
            this.contracts
                .map(async (contract) => locklift.provider.getBalance(contract.address))
                .map(async (value) => parseInt(await value, 10))
        );

        this.checkpoints[name] = balances;
    }

    getCheckPoint(name: string) {
        const checkpoint = this.checkpoints[name];

        if (!checkpoint) throw new Error(`No checkpoint "${name}"`);

        return checkpoint;
    }

    async getDifference(startCheckPointName: string, endCheckPointName: string) {
        const startCheckPoint = this.getCheckPoint(startCheckPointName);
        const endCheckPoint = this.getCheckPoint(endCheckPointName);

        let difference: { [key: string]: number } = {};

        for (const [startMetric, endMetric, contract] of _.zip(
            startCheckPoint,
            endCheckPoint,
            this.contracts
        )) {
            difference[contract.name] = endMetric - startMetric;
        }

        return difference;
    }

    addContract(contract: { name: string; address: Address }, fill = 0) {
        this.contracts.push(contract);

        for (const checkpoint of Object.keys(this.checkpoints)) {
            this.checkpoints[checkpoint].push(fill);
        }
    }
}


module.exports = {
    MetricManager
}

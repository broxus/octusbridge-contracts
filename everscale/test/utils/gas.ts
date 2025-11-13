import { BigNumber } from "bignumber.js";
import { Contract } from "locklift";
import { GasValuesAbi } from "../../build/factorySource"

const gasPrice = 1000;

export const calcValue = (
    gas: (ReturnType<
        ReturnType<
            Contract<GasValuesAbi>["methods"]["getEvmTvmAlienEventInitialBalance"]
        >["call"]
    > extends Promise<infer T>
        ? T
        : never)["value0"],
    isTransfer = false,
): string =>
    new BigNumber(gas.dynamicGas)
        .plus(isTransfer ? 100000 : 0)
        .times(gasPrice)
        .plus(gas.fixedValue)
        .toString();

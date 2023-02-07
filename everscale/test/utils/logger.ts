const logger = require("mocha-logger");
import {Address} from "locklift";


export const logContract = async (name: string, address: Address) => {
    const balance = await locklift.provider.getBalance(address);

    logger.log(`${name} (${address}) - ${locklift.utils.fromNano(balance)}`);
};


// module.exports = {
//     logContract
// };

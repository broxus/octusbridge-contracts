const ethers = require('ethers');
const fs = require("fs");


const bridgeAddress = '0xc25CA21377C5bbC860F0bF48dF685D744A411489';
const rpc = 'https://bsc-dataseed.binance.org/';
const eventContract = '0:70ef19e3a823f166058983b4450925e911240fee5c775f41adad3be664a757a0';


const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const bridge = new ethers.Contract(
        bridgeAddress,
        JSON.parse(fs.readFileSync('./../ethereum/abi/Bridge.json')),
        provider
    );

    const event = await locklift.factory.getContract('MultiVaultEverscaleEventNative');
    event.setAddress(eventContract);

    const details = await event.call({ method: 'getDetails' });
    const roundNumber = await event.call({ method: 'round_number' });

    const eventDataDecoded = await event.call({ method: 'getDecodedData' });

    console.log(eventDataDecoded);

    const eventDataEncoded = ethers.utils.defaultAbiCoder.encode(
        ['int8', 'uint256', 'string', 'string', 'uint8', 'uint128', 'uint160', 'uint256'],
        [
            eventDataDecoded.token_.split(':')[0],
            `0x${eventDataDecoded.token_.split(':')[1]}`,

            eventDataDecoded.name_,
            eventDataDecoded.symbol_,
            eventDataDecoded.decimals_.toFixed(),

            eventDataDecoded.amount_.toString(),
            eventDataDecoded.recipient_.toFixed(),
            eventDataDecoded.chainId_.toString(),
        ]
    );

    const configuration = await locklift.factory.getContract('EverscaleEventConfiguration');
    configuration.setAddress(details._eventInitData.configuration);

    // console.log(details);

    const configurationDetails = await configuration.call({ method: 'getDetails' });

    const encodedEvent = ethers.utils.defaultAbiCoder.encode(
        [
            `tuple(
          uint64 eventTransactionLt,
          uint32 eventTimestamp,
          bytes eventData,
          int8 configurationWid,
          uint256 configurationAddress,
          int8 eventContractWid,
          uint256 eventContractAddress,
          address proxy,
          uint32 round
        )`
        ],
        [{
            eventTransactionLt: details._eventInitData.voteData.eventTransactionLt.toString(),
            eventTimestamp: details._eventInitData.voteData.eventTimestamp.toString(),
            eventData: eventDataEncoded,
            configurationWid: details._eventInitData.configuration.split(':')[0],
            configurationAddress: '0x' + details._eventInitData.configuration.split(':')[1],
            eventContractWid: eventContract.split(':')[0],
            eventContractAddress: '0x' + eventContract.split(':')[1],
            proxy: `0x${configurationDetails._networkConfiguration.proxy.toString(16)}`,
            round: roundNumber.toString(),
        }]
    );


    let signatures = await Promise.all(details._signatures.map(async (sign) => {
        return {
            sign,
            address: ethers.BigNumber.from(await bridge.recoverSignature(encodedEvent, sign))
        };
    }));

    signatures = signatures.sort((a, b) => {
        if (a.address.eq(b.address)) {
            return 0
        }
        if (a.address.gt(b.address)) {
            return 1
        } else {
            return -1
        }
    });

    // console.log(signatures);

    console.log(encodedEvent);
    console.log(`[${signatures.map((b) => '0x' + b.sign.toString('hex')).join(',')}]`);
};


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
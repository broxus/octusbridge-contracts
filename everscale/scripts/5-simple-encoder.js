async function main() {
    const Encoder = await locklift.factory.getContract('Encoder');
    const [keyPair] = await locklift.keys.getKeyPairs();

    let encoder = await locklift.giver.deployContract({
       contract: Encoder,
       constructorParams: {},
       initParams: {},
       keyPair
    }, locklift.utils.convertCrystal(1, 'nano'));

    const num_to_encode = 1;
    const encode_res = await encoder.call({
        method: 'encode_uint8',
        params: {
            num: num_to_encode
        }
    });

    console.log(`Encoded ${num_to_encode} - ${encode_res}`)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });

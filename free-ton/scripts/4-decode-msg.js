async function main() {
    const staking = await locklift.factory.getAccount('Staking');

    const decodedMessage = await this.locklift.ton.client.abi.decode_message_body({
        abi: {
            type: 'Contract',
            value: staking.abi
        },
        body: 'te6ccgEBAQEAOAAAa0yrMhQAAAAAAAAAAAAAAAAAAAACQAdvqp+qgPUYdZAH3+q7kGJrXQIcTntZ4KYgdJg+WT87yA==',
        is_internal: true
    });

    console.log(decodedMessage);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });

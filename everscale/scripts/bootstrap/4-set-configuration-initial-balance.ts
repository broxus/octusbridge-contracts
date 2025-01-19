import { Address, toNano, WalletTypes } from 'locklift';

type InitialBalance = ['EverscaleEthereumEventConfiguration' | 'EthereumEverscaleEventConfiguration', string];

const initialBalances: Record<string, InitialBalance> = {
    '0:40f2d126d0311ea6ca3f52d3826a33d1ab157b56f6beba69b5949f2f6579261e': ['EverscaleEthereumEventConfiguration', toNano(4.9)],
    '0:e3b5e979651867c89c8122a924982be4d6eb3ef57e4fd22c9d46f8d2e7830f6c': ['EverscaleEthereumEventConfiguration', toNano(2.9)],
    '0:854eb4fc03b77c231768e4beee9369dd7cbb938f9751993c817d9eabf3529f04': ['EthereumEverscaleEventConfiguration', toNano(4.9)],
    '0:0abd3afa61f5939ef3bcd8d17113f56cbb1ef9a85d48610d425d981aee40097d': ['EthereumEverscaleEventConfiguration', toNano(2.9)],
};

const ADMIN = new Address('0:2746d46337aa25d790c97f1aefb01a5de48cc1315b41a4f32753146a1e1aeb7d');

const Gas = {
    CONFIGURATION_SET_INITIAL_BALANCE: toNano(0.2),
};

const main = async (): Promise<void> => {
    await locklift.factory.accounts.addExistingAccount({
        type: WalletTypes.EverWallet,
        address: ADMIN,
    });

    const pendingConfigurationTxs: Promise<unknown>[] = [];

    for (const [configurationAddress, [configurationType, initialBalance]] of Object.entries(initialBalances)) {
        const configuration = locklift.factory.getDeployedContract(configurationType, new Address(configurationAddress));
        const currentInitialBalance = await configuration.methods
            .getDetails({ answerId: 0 })
            .call()
            .then((r) => r._basicConfiguration.eventInitialBalance);

        if (currentInitialBalance === initialBalance) {
            continue;
        }

        const tx = locklift.transactions.waitFinalized(
            configuration.methods
                .setEventInitialBalance({ eventInitialBalance: initialBalance })
                .send({ from: ADMIN, amount: Gas.CONFIGURATION_SET_INITIAL_BALANCE, bounce: true }),
        ).then(() => console.log(`${configurationAddress} -> ${initialBalance}`));

        pendingConfigurationTxs.push(tx);
    }

    await Promise.all(pendingConfigurationTxs);
};

main().then(() => console.log('Success'));

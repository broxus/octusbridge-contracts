const { legos } = require('@studydefi/money-legos');
const {
    expect,
    defaultConfiguration,
    defaultTonRecipient,
    getVaultByToken,
    generateWallets,
    encodeTonEvent,
    encodeWithdrawalData,
    ...utils
} = require('../utils');


describe('Check deposit to factory', async () => {
    let vault, wrapper, dai;

    it('Setup contracts', async () => {
        await deployments.fixture();

        dai = await ethers.getContractAt(
            legos.erc20.abi,
            legos.erc20.dai.address,
        );
    });

    it('Create vault', async () => {
        const owner = await ethers.getNamedSigner('owner');
        const { guardian } = await getNamedAccounts();

        const registry = await ethers.getContract('Registry');

        await registry.connect(owner).newVault(
            dai.address,
            guardian,
            9,
            0,
            0,
        );

        vault = await getVaultByToken(registry, dai.address);

        wrapper = await ethers.getContractAt(
            'VaultWrapper',
            (await vault.wrapper())
        );
    });

    it('Set configuration', async () => {
        const owner = await ethers.getNamedSigner('owner');

        await vault
            .connect(owner)
            .setConfiguration(defaultConfiguration);
    });

    it('Set deposit limit', async () => {
        const depositLimit = ethers.utils.parseUnits('10000', 18);

        const owner = await ethers.getNamedSigner('owner');

        await vault
            .connect(owner)
            .setDepositLimit(depositLimit);
    });

    it('Fill Alice balance with Dai', async () => {
        const { alice, dai_owner } = await getNamedAccounts();

        await utils.issueTokens({
            token: dai,
            owner: dai_owner,
            recipient: alice,
            amount: ethers.utils.parseUnits('100000', 18)
        });
    });

    it('Alice infinite approve on vault', async () => {
        const alice = await ethers.getNamedSigner('alice');

        await dai
            .connect(alice)
            .approve(vault.address, ethers.utils.parseUnits('1000000000000', 18));
    });

    describe('Deposit Dai to the factory', async () => {
        it('Deposit', async () => {
            const alice = await ethers.getNamedSigner('alice');

            await expect(wrapper.connect(alice).depositToFactory(
                10, // amount
                0, // wid
                1, // user
                2, // creditor
                3, // recipient
                10, // tokenAmount
                1, // tonAmount
                1, // swapType
                1, // slippageNumerator
                2, // slippageDenominator
                "0x00" // level3
            ))
                .to.emit(wrapper, 'FactoryDeposit')
                .to.not.emit(vault, 'Deposit')
                // .withArgs(10, 0, 1, 2, 3, 10, 1, 1, 1, 2, "0x07", "0x00")
            ;
        });
    });
});
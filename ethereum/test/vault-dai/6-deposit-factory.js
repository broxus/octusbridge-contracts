const { legos } = require('@studydefi/money-legos');
const {
    expect,
    defaultConfiguration,
    defaultTonRecipient,
    getVaultByToken,
    generateWallets,
    encodeEverscaleEvent,
    encodeWithdrawalData,
    ...utils
} = require('../utils');


describe('Check deposit to factory', async () => {
    let vault, dai;

    it('Setup contracts', async () => {
        await deployments.fixture();

        dai = await ethers.getContractAt(
            legos.erc20.abi,
            legos.erc20.dai.address,
        );
        vault = await ethers.getContract('VaultDai');
    });

    it('Deposit to factory', async () => {
        const alice = await ethers.getNamedSigner('alice');
        const amount = ethers.utils.parseUnits('10', 18);

        await expect(vault.connect(alice).depositToFactory(
            amount,
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
            .to.emit(vault, 'FactoryDeposit')
            .withArgs(await vault.convertToTargetDecimals(amount), 0, 1, 2, 3, 10, 1, 1, 1, 2, "0x07", "0x00")
            .to.not.emit(vault, 'Deposit');
    });
});
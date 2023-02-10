const _ = require("lodash");
const {ethers} = require("hardhat");


module.exports = async ({getNamedAccounts}) => {
    const {
        deployer,
    } = await getNamedAccounts();

    const OLD_DEPOSIT_FACET_ADDRESS = '0x474c88ed186f279316f2619ac635da2f7a696a0a'
    const NEW_DEPOSIT_FACET_ADDRESS = '0xcBe940D5Bb27992A554DC08F7B9a4D2a103874A1'

    const FACET_NAME = "MultiVaultFacetDeposit"
    const MULTI_VAULT_ADDRESS = "0x7dbFdC0a2d18f690d35F38E66DfAB795c0175DAc"
    const multiVaultContract = await ethers.getContractAt("MultiVault", MULTI_VAULT_ADDRESS).then(contract => contract.connect(deployer))

    const createFacetInstruction = async ({actionType, facet}) => {

        const functionSelectors = Object.entries(facet.interface.functions).map(([function_name, fn]) => {
            const sig_hash = ethers.utils.Interface.getSighash(fn);

            console.log(name, function_name, sig_hash);

            return sig_hash;
        });

        return {
            facetAddress: facet.address,
            action: actionType,
            functionSelectors
        };
    }
    const upgradeConfig = await Promise.all([
        {
            facet: await ethers.getContractAt(FACET_NAME, OLD_DEPOSIT_FACET_ADDRESS),
            actionType: 2
        },
        {
            facet: await ethers.getContractAt(FACET_NAME, NEW_DEPOSIT_FACET_ADDRESS),
            actionType: 0
        }
    ].map(createFacetInstruction))

    const tx = await multiVaultContract.diamondCut(
        upgradeConfig,
        ethers.constants.AddressZero,
        ""
    ).then(res => res.wait())
    console.log(tx)
};


module.exports.tags = ['Upgrade_MultiVault_Facet_Deposit'];

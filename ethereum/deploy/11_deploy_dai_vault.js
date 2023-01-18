const { legos } = require('@studydefi/money-legos');
const utils = require('./../test/utils');


module.exports = async ({getNamedAccounts, deployments}) => {
    // const { owner, dai_owner, withdrawGuardian } = await getNamedAccounts();
    //
    // const executeOptions = {
    //     from: owner,
    //     log: true,
    // };
    //
    // // Save Dai as an artifact
    // await deployments.save('Dai', {
    //     abi: legos.erc20.dai.abi,
    //     address: legos.erc20.dai.address
    // });
    //
    // // Deploy Vault and save as an artifact
    // const tx = await deployments.execute(
    //     'Registry',
    //     executeOptions,
    //     'newVault',
    //     legos.erc20.dai.address,
    //     9,
    //     0
    // );
    //
    // const [{
    //     args: {
    //         vault
    //     }
    // }] = tx.events.filter(e => e.event === 'NewVault');
    //
    // const {
    //     abi: vaultAbi
    // } = await deployments.getExtendedArtifact('Vault');
    //
    // await deployments.save('VaultDai', {
    //     abi: vaultAbi,
    //     address: vault,
    // });
    //
    //
    // // Set deposit limit
    // await deployments.execute(
    //     'VaultDai',
    //     executeOptions,
    //     'setDepositLimit',
    //     ethers.utils.parseUnits('1000000', 18)
    // );
    //
    // // Set undeclared withdrawal limit
    // await deployments.execute(
    //     'VaultDai',
    //     executeOptions,
    //     'setUndeclaredWithdrawLimit',
    //     ethers.utils.parseUnits('1000', 18)
    // );
    //
    // // Set withdraw per period limit
    // await deployments.execute(
    //     'VaultDai',
    //     executeOptions,
    //     'setWithdrawLimitPerPeriod',
    //     ethers.utils.parseUnits('1500', 18)
    // );
    //
    // // Set withdraw guardian
    // await deployments.execute(
    //     'VaultDai',
    //     executeOptions,
    //     'setWithdrawGuardian',
    //     withdrawGuardian
    // );
    //
    // // Set Everscale configuration
    // await deployments.execute(
    //     'VaultDai',
    //     executeOptions,
    //     'setConfiguration',
    //     utils.defaultConfiguration
    // );
    //
    // // Set rewards
    // await deployments.execute(
    //     'VaultDai',
    //     executeOptions,
    //     'setRewards',
    //     {
    //         wid: 0,
    //         addr: 7777,
    //     }
    // );
    //
    // // Distribute Dai across actors
    // const dai = await ethers.getContractAt(
    //     legos.erc20.abi,
    //     legos.erc20.dai.address,
    // );
    // const vaultDai = await deployments.get('VaultDai');
    //
    // // - Impersonate Dai owner
    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [dai_owner]
    // });
    //
    // const daiOwner = await ethers.provider.getSigner(dai_owner);
    //
    // // - Airdrop Dai
    // const actors = ['alice', 'bob', 'eve'];
    //
    // for (const actor of actors) {
    //     const actorSigner = await ethers.getNamedSigner(actor);
    //
    //     await dai
    //         .connect(daiOwner)
    //         .transfer(actorSigner.address, ethers.utils.parseUnits('100000'));
    //
    //     await dai
    //         .connect(actorSigner)
    //         .approve(vaultDai.address, ethers.utils.parseUnits('1000000000000', 18));
    // }

};

module.exports.tags = ['Deploy_Dai_Vault'];

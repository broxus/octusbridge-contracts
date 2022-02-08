module.exports = async ({getNamedAccounts, deployments}) => {
  const { deployer } = await getNamedAccounts();

  const artifact = await deployments.getExtendedArtifact('Vault');
  console.log(artifact.bytecode.length / 2);

  await deployments.deploy('Vault', {
    from: deployer,
    log: true,
  });
};

module.exports.tags = ['Deploy_Vault'];

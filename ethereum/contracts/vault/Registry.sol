// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.2;

import "./../interfaces/IBridge.sol";
import "./../interfaces/IVault.sol";
import "./../interfaces/IRegistry.sol";
import "./../interfaces/IVaultWrapper.sol";

import "./VaultWrapper.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";


contract Registry is Ownable, IRegistry {
    address constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    // len(releases)
    uint256 public numReleases;
    mapping(uint256 => address) public releases;
    // Token => len(vaults)
    mapping(address => uint256) public numVaults;
    mapping(address => mapping(uint256 => address)) vaults;

    // Index of token added => token address
    mapping(uint256 => address) tokens;
    // len(tokens)
    uint256 public numTokens;
    // Inclusion check for token
    mapping(address => bool) public isRegistered;

    address public bridge;
    address public proxyAdmin;
    address public wrapper;

    mapping(address => string) public tags;
    mapping(address => bool) public banksy;

    function compareStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    constructor(
        address _bridge,
        address _proxyAdmin,
        address _wrapper
    ) {
        bridge = _bridge;
        proxyAdmin = _proxyAdmin;
        wrapper = _wrapper;
    }

    function setBridge(
        address _bridge
    ) external onlyOwner {
        bridge = _bridge;
    }

    function setProxyAdmin(
        address _proxyAdmin
    ) external onlyOwner {
        proxyAdmin = _proxyAdmin;
    }

    function latestRelease()
        external
        view
    returns(
        string memory api_version
    ) {
        return IVault(releases[numReleases - 1]).apiVersion();
    }

    function latestVault(
        address token
    )
        external
        view
    returns(
        address
    ) {
        return vaults[token][numVaults[token] - 1];
    }

    function newRelease(
        address vault
    ) external onlyOwner {
        uint256 release_id = numReleases;

        if (release_id > 0) {
            require(
                !compareStrings(
                    IVault(releases[release_id - 1]).apiVersion(),
                    IVault(vault).apiVersion()
                ),
                "Registry: new release should have different api version"
            );
        }

        releases[release_id] = vault;
        numReleases = release_id + 1;

        emit NewRelease(release_id, vault, IVault(vault).apiVersion());
    }

    function _newProxyVault(
        address token,
        address governance,
        address guardian,
        uint256 releaseTarget
    ) internal returns(address) {
        address release = releases[releaseTarget];

        require(release != ZERO_ADDRESS, "Registry: release target is wrong");

        // Deploy Vault release proxy, owned by proxy admin
        TransparentUpgradeableProxy vaultProxy = new TransparentUpgradeableProxy(
            release,
            proxyAdmin,
            ""
        );

        // Clone wrapper
        TransparentUpgradeableProxy _wrapper = new TransparentUpgradeableProxy(
            wrapper,
            proxyAdmin,
            ""
        );

        // Initialize wrapper
        IVaultWrapper(address(_wrapper)).initialize(
            address(vaultProxy)
        );

        // Initialize Vault
        IVault(address(vaultProxy)).initialize(
            token,
            governance,
            bridge,
            address(_wrapper),
            guardian,
            ZERO_ADDRESS
        );

        return address(vaultProxy);
    }

    function _registerVault(
        address token,
        address vault
    ) internal {
        uint256 vault_id = numVaults[token];

        if (vault_id > 0) {
            require(
                !compareStrings(
                    IVault(vaults[token][vault_id - 1]).apiVersion(),
                    IVault(vault).apiVersion()
                ),
                "Registry: new vault should have different api version"
            );
        }

        vaults[token][vault_id] = vault;
        numVaults[token] = vault_id + 1;

        if (!isRegistered[token]) {
            isRegistered[token] = true;
            tokens[numTokens] = token;
            numTokens += 1;
        }

        emit NewVault(token, vault_id, vault, IVault(vault).apiVersion());
    }

    function newVault(
        address token,
        address guardian,
        uint256 releaseDelta
    ) external onlyOwner returns (address) {
        uint256 releaseTarget = numReleases - 1 - releaseDelta;

        address vault = _newProxyVault(
            token,
            msg.sender,
            guardian,
            releaseTarget
        );

        _registerVault(token, vault);

        return vault;
    }

    function newExperimentalVault(
        address token,
        address governance,
        address guardian,
        uint256 releaseDelta
    ) external returns(address) {
        uint256 releaseTarget = numReleases - 1 - releaseDelta;

        address vault = _newProxyVault(
            token,
            governance,
            guardian,
            releaseTarget
        );

        emit NewExperimentalVault(
            token,
            msg.sender,
            vault,
            IVault(vault).apiVersion()
        );

        return vault;
    }

    function endorseVault(
        address vault,
        uint256 releaseDelta
    ) external onlyOwner {
        require(
            IVault(vault).governance() == msg.sender,
            "Registry: wrong vault governance"
        );

        uint256 releaseTarget = numReleases - 1 - releaseDelta;
        string memory api_version = IVault(releases[releaseTarget]).apiVersion();

        require(
            compareStrings(IVault(vault).apiVersion(), api_version),
            "Registry: vault should have same api version as release"
        );

        _registerVault(IVault(vault).token(), vault);
    }

    function setBanksy(
        address tagger,
        bool allowed
    ) external onlyOwner {
        banksy[tagger] = allowed;
    }

    function tagVault(
        address vault,
        string memory tag
    ) external {
        if (msg.sender != owner()) {
            require(
                banksy[msg.sender],
                "Registry: only owner or banksy allowed to tag"
            );
        }

        tags[vault] = tag;
        emit VaultTagged(vault, tag);
    }
}

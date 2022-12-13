pragma ton-solidity >= 0.39.0;

pragma AbiHeader expire;

import '@broxus/contracts/contracts/libraries/MsgFlag.sol';
import '@broxus/contracts/contracts/access/InternalOwner.sol';
import '@broxus/contracts/contracts/utils/RandomNonce.sol';

import "./../../utils/TransferUtils.sol";

import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensTransferCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IAcceptTokensMintCallback.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/IBurnableTokenWallet.sol";
import "ton-eth-bridge-token-contracts/contracts/interfaces/ITokenWallet.sol";
import "ton-eth-bridge-token-contracts/contracts/TokenWalletPlatform.sol";


contract Mediator is IAcceptTokensTransferCallback, IAcceptTokensMintCallback, TransferUtils, InternalOwner, RandomNonce {
    uint128 constant DEPLOY_WALLET_VALUE = 0.2 ton;

    TvmCell alienTokenWalletPlatformCode;

    constructor(
        address _owner,
        TvmCell _alienTokenWalletPlatformCode
    ) public {
        tvm.accept();

        setOwnership(_owner);
        alienTokenWalletPlatformCode = _alienTokenWalletPlatformCode;
    }

    /// @notice Accept mint and burn tokens in favor of alien proxy
    function onAcceptTokensMint(
        address tokenRoot,
        uint128 amount,
        address remainingGasTo,
        TvmCell payload
    ) external override reserveAtLeastTargetBalance {
        address wallet = _deriveAlienTokenWallet(tokenRoot);

        (address proxy, TvmCell burnPayload) = abi.decode(payload, (address, TvmCell));

        IBurnableTokenWallet(wallet).burn{
            bounce: false,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(amount, remainingGasTo, proxy, burnPayload);
    }

    /// @notice Accept incoming transfer and forward tokens to the native proxy
    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override reserveAtLeastTargetBalance {
        (address proxy, TvmCell transferPayload) = abi.decode(payload, (address, TvmCell));

        ITokenWallet(msg.sender).transfer{
            bounce: false,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(amount, proxy, DEPLOY_WALLET_VALUE, remainingGasTo, true, transferPayload);
    }

    function _deriveAlienTokenWallet(
        address root
    ) internal returns(address) {
        TvmCell stateInit = tvm.buildStateInit({
            contr: TokenWalletPlatform,
            varInit: {
                root: root,
                owner: address(this)
            },
            pubkey: 0,
            code: alienTokenWalletPlatformCode
        });

        return address(tvm.hash(stateInit));
    }

    function upgrade(
        TvmCell code
    ) external onlyOwner {
        TvmCell data = abi.encode(
            owner,
            alienTokenWalletPlatformCode,
            _randomNonce
        );

        tvm.setcode(code);
        tvm.setCurrentCode(code);

        onCodeUpgrade(data);
    }

    function onCodeUpgrade(
        TvmCell data
    ) private {
        tvm.resetStorage();

        (
            owner,
            alienTokenWalletPlatformCode,
            _randomNonce
        ) = abi.decode(data, (address, TvmCell, uint));
    }
}

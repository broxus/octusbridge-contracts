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
    enum Operation { Burn, Transfer }

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

    /// @notice Accept incoming mint
    function onAcceptTokensMint(
        address tokenRoot,
        uint128 amount,
        address remainingGasTo,
        TvmCell payload
    ) external override reserveAtLeastTargetBalance {
        (
            Operation operation,
            address proxy,
            TvmCell operationPayload
        ) = abi.decode(payload, (Operation, address, TvmCell));

        address wallet = _deriveAlienTokenWallet(tokenRoot);

        if (operation == Operation.Burn) {
            _burn(wallet, amount, proxy, remainingGasTo, operationPayload);
        } else if (operation == Operation.Transfer) {
            _transfer(wallet, amount, proxy, remainingGasTo, operationPayload);
        }
    }

    /// @notice Accept incoming transfer
    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) external override reserveAtLeastTargetBalance {
        (
            Operation operation,
            address proxy,
            TvmCell operationPayload
        ) = abi.decode(payload, (Operation, address, TvmCell));

        address wallet = msg.sender;

        if (operation == Operation.Burn) {
            _burn(wallet, amount, proxy, remainingGasTo, operationPayload);
        } else if (operation == Operation.Transfer) {
            _transfer(wallet, amount, proxy, remainingGasTo, operationPayload);
        }
    }

    function _transfer(
        address wallet,
        uint128 amount,
        address proxy,
        address remainingGasTo,
        TvmCell payload
    ) internal {
        ITokenWallet(wallet).transfer{
            bounce: false,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(amount, proxy, DEPLOY_WALLET_VALUE, remainingGasTo, true, payload);
    }

    function _burn(
        address wallet,
        uint128 amount,
        address proxy,
        address remainingGasTo,
        TvmCell payload
    ) internal {
        IBurnableTokenWallet(wallet).burn{
            bounce: false,
            value: 0,
            flag: MsgFlag.ALL_NOT_RESERVED
        }(amount, remainingGasTo, proxy, payload);
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

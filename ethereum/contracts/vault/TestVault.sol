pragma solidity ^0.8.2;


import "./Vault.sol";
import "hardhat/console.sol";


contract TestVault is Vault {
    using SafeERC20 for IERC20;

//    function saveWithdraw(
//        bytes memory payload,
//        bytes[] memory signatures
//    )
//    public
//    override
//    onlyEmergencyDisabled
//    withdrawalNotSeenBefore(payload)
//    returns (bool instantWithdrawal, PendingWithdrawalId memory pendingWithdrawalId)
//    {
//        require(
//            IBridge(bridge).verifySignedEverscaleEvent(payload, signatures) == 0,
//            "Vault: signatures verification failed"
//        );
//
//        // Decode Everscale event
//        (EverscaleEvent memory _event) = abi.decode(payload, (EverscaleEvent));
//
//        require(
//            _event.configurationWid == configuration_.wid &&
//            _event.configurationAddress == configuration_.addr
//        );
//        bytes32 payloadId = keccak256(payload);
//
//        // Decode event data
//        WithdrawalParams memory withdrawal = decodeWithdrawalEventData(_event.eventData);
//
//        require(withdrawal.chainId == _getChainID());
//
//        // Ensure withdrawal fee
//        uint256 fee = _calculateMovementFee(withdrawal.amount, withdrawFee);
//
//        if (fee > 0) _transferToEverscale(rewards_, fee);
//
//        // Consider withdrawal period limit
//        WithdrawalPeriodParams memory withdrawalPeriod = _withdrawalPeriod(_event.eventTimestamp);
//        _withdrawalPeriodIncreaseTotalByTimestamp(_event.eventTimestamp, withdrawal.amount);
//
//        bool withdrawalLimitsPassed = _withdrawalPeriodCheckLimitsPassed(withdrawal.amount, withdrawalPeriod);
//
//        // Withdrawal is less than limits and Vault's token balance is enough for instant withdrawal
//        if (withdrawal.amount <= _vaultTokenBalance() && withdrawalLimitsPassed) {
//            IERC20(token).safeTransfer(withdrawal.recipient, withdrawal.amount - fee);
//
//            emit InstantWithdrawal(payloadId, withdrawal.recipient, withdrawal.amount - fee);
//
//            return (true, PendingWithdrawalId(address(0), 0));
//        }
//
//        // Save withdrawal as a pending
//        uint256 id = _pendingWithdrawalCreate(
//            withdrawal.recipient,
//            withdrawal.amount - fee,
//            _event.eventTimestamp
//        );
//
//        emit PendingWithdrawalCreated(withdrawal.recipient, id, withdrawal.amount - fee, payloadId);
//
//        pendingWithdrawalId = PendingWithdrawalId(withdrawal.recipient, id);
//
//        if (!withdrawalLimitsPassed) {
//            _pendingWithdrawalApproveStatusUpdate(pendingWithdrawalId, ApproveStatus.Required);
//
//            emit PendingWithdrawalUpdateApproveStatus(
//                withdrawal.recipient,
//                id,
//                ApproveStatus.Required
//            );
//        }
//
//        return (false, pendingWithdrawalId);
//    }
}

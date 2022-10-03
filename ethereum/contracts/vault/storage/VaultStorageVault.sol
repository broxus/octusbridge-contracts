// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.2;


import "./../../interfaces/IEverscale.sol";
import "./../../interfaces/vault/IVaultFacetPendingWithdrawals.sol";
import "./../../interfaces/vault/IVaultFacetStrategies.sol";


library VaultStorageVault {
    uint256 constant MAX_BPS = 10_000;
    uint256 constant WITHDRAW_PERIOD_DURATION_IN_SECONDS = 60 * 60 * 24; // 24 hours
    uint256 constant SECS_PER_YEAR = 31_556_952; // 365.2425 days
    uint256 constant DEGRADATION_COEFFICIENT = 10**18;
    // - SET_SIZE can be any number but having it in power of 2 will be more gas friendly and collision free.
    // - Make sure SET_SIZE is greater than 20
    uint256 constant SET_SIZE = 32;

    // Previous version of the Vault contract was built with Upgradable Proxy Pattern
    bytes32 constant VAULT_LEGACY_STORAGE_POSITION = 0x0000000000000000000000000000000000000000000000000000000000000002;

    struct Storage {
        // Bridge
        // - Bridge address, used to verify relay's signatures. Read more on `saveWithdraw`
        address bridge;
        // - Bridge EVER-EVM event configuration
        // NOTE: Some variables have "_" postfix and not declared as a "public override"
        // Instead they have explicit corresponding getter
        // It's a compiler issue, described here - https://github.com/ethereum/solidity/issues/11826
        IEverscale.EverscaleAddress configuration_;

        // - Withdrawal receipt IDs, used to prevent double spending
        mapping(bytes32 => bool) withdrawalIds;
        // - Rewards address in Everscale, receives fees, gains, etc
        IEverscale.EverscaleAddress rewards_;

        // Pending withdrawals
        // - Counter pending withdrawals per user
        mapping(address => uint) pendingWithdrawalsPerUser;
        // - Pending withdrawal details
        mapping(address => mapping(uint256 => IVaultFacetPendingWithdrawals.PendingWithdrawalParams)) pendingWithdrawals_;
        // - Total amount of `token` in pending withdrawal status
        uint pendingWithdrawalsTotal;

        // Ownership
        // - Governance
        address governance;
        // - Pending governance, used for 2-step governance transfer
        address pendingGovernance;
        // - Guardian, responsible for security actions
        address guardian;
        // - Withdraw guardian, responsible for approving / rejecting some of the withdrawals
        address withdrawGuardian;
        // - Management, responsible for managing strategies
        address management;

        // Token
        // - Vault's token
        address token;
        // - Decimals on corresponding token in the Everscale network
        uint256 targetDecimals;
        // - Decimals of `token`
        uint256 tokenDecimals;

        // Fees
        // - Deposit fee, in BPS
        uint256 depositFee;
        // - Withdraw fee, in BPS
        uint256 withdrawFee;
        // - Management fee, in BPS
        uint256 managementFee;
        // - Performance fee, in BPS
        uint256 performanceFee;

        // Strategies
        // - Strategies registry
        mapping(address => IVaultFacetStrategies.StrategyParams) strategies_;
        // - Ordering that `withdraw` uses to determine which strategies to pull funds from
        // Does *NOT* have to match the ordering of all the current strategies that
        //      exist, but it is recommended that it does or else withdrawal depth is
        //      limited to only those inside the queue.
        // Ordering is determined by governance, and should be balanced according
        //      to risk, slippage, and/or volatility. Can also be ordered to increase the
        //      withdrawal speed of a particular Strategy.
        // The first time a zero address is encountered, it stops withdrawing
        // Maximum amount of strategies in withdrawal queue = 20
        address[20] withdrawalQueue_;

        // Security
        // - Emergency shutdown, most of operations are unavailable in emergency mode
        bool emergencyShutdown;
        // - Withdraw limit per period
        uint256 withdrawLimitPerPeriod;
        // - Undeclared withdraw limit
        uint256 undeclaredWithdrawLimit;
        // - Withdrawal periods. Each period is `WITHDRAW_PERIOD_DURATION_IN_SECONDS` seconds long.
        // If some period has reached the `withdrawalLimitPerPeriod` - all the future
        // withdrawals in this period require manual approve, see note on `setPendingWithdrawalsApprove`
        mapping(uint256 => IVaultFacetPendingWithdrawals.WithdrawalPeriodParams) withdrawalPeriods_;

        // Vault
        // - Limit for `totalAssets` the Vault can hold
        uint256 depositLimit;
        // - Debt ratio for the Vault across al strategies (<= MAX_BPS)
        uint256 debtRatio;
        // - Amount of all tokens that all strategies have borrowed
        uint256 totalDebt;
        // - block.timestamp of last report
        uint256 lastReport;
        // - How much profit is locked and cant be withdrawn
        uint256 lockedProfit;
        // - Rate per block of degradation. DEGRADATION_COEFFICIENT is 100% per block
        uint256 lockedProfitDegradation;

        // STORAGE UPDATE 1
        uint256 fees;
    }

    function _storage() internal pure returns (Storage storage s) {
        assembly {
            s.slot := VAULT_LEGACY_STORAGE_POSITION
        }
    }

//    function configuration()
//        external
//        view
//        override
//    returns (EverscaleAddress memory) {
//        return configuration_;
//    }
//
//    function rewards()
//        external
//        view
//        override
//    returns (EverscaleAddress memory) {
//        return rewards_;
//    }
//
//
//    function withdrawalPeriods(
//        uint256 withdrawalPeriodId
//    ) external view override returns (WithdrawalPeriodParams memory) {
//        return withdrawalPeriods_[withdrawalPeriodId];
//    }
}

##On-chain:
###1) Start voting: 
One of relay call function **Bridge.startVotingForUpdateConfig** with params  

**stateInit** - init state for new voting contract  

**addEventTypeRequiredConfirmationsPercent** - value in range 1-100, required percent of confirmations for add new event type 

**removeEventTypeRequiredConfirmationsPercent** - value in range 1-100, required percent of confirmations for remove event type   

**addRelayRequiredConfirmationsPercent** - value in range 1-100, required percent of confirmations for add new relay  

**removeRelayRequiredConfirmationsPercent** - value in range 1-100, required percent of confirmations for remove existed relay    

**updateConfigRequiredConfirmationsPercent** - value in range 1-100, required percent of confirmations for update config    

**eventRootCode** - new version of code EventRoot 

**tonToEthEventCode** - new version of code TonToEthEvent  

**ethToTonEventCode** - new version of code EthToTonEvent  

This function deploy new voting contract of type **VotingForChangeConfig** and emit event **VotingForUpdateConfigStarted** contains address of this contract

###2) Register relays votes: 

Relays call external function **VotingForChangeConfig.getDetails** for getting proposal info. That includes all of config params and in addition **changeNonce**   

Supporting relay must:
 1) calculate hash of data returned by getDetails
 2) calculate Ed25519-signature for hash, using privateKey.
 3) call function Bridge.voteForUpdateConfig with params 
    - votingAddress - address of VotingForChangeConfig contract
    - highPart - high part of signature
    - lowPart - low part of signature

###3) Applying changes

After receiving the required number of signatures any of supporting relay can call function VotingForChangeConfig.applyChange.  
That function call Bridge.updateConfig and then all changes will be applied.

##Off-chain:

All signatures can be received offline and then someone can call function Bridge.updateConfig directly.  
In this case for *changeNonce* need to use any not previously used number of type uint256. 

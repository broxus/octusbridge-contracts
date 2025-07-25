import { Ed25519KeyPair } from "nekoton-wasm";
import { Address } from "locklift";

const logger = require("mocha-logger");

export enum EventType {
    EthereumEverscale,
    EverscaleEthereum,
    SolanaEverscale,
    EverscaleSolana
}

export enum EventAction {
    Confirm,
    Reject
}

export const getRequiredVotes = async (
    eventContract_: Address,
): Promise<number> => {
    const eventContract = locklift.factory.getDeployedContract(
        "EthereumEverscaleBaseEvent",
        eventContract_
    );

    return eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));
}

export const processEvent = async (
    relays: Ed25519KeyPair[],
    eventContract_: Address,
    type_: EventType,
    action_: EventAction,
) => {
    const requiredVotes = await getRequiredVotes(eventContract_);

    const votes = [];

    for (const [relayId, relay] of Object.entries(relays.slice(0, requiredVotes))) {
        logger.log(`Confirm #${relayId} from ${relay.publicKey}`);

        locklift.keystore.addKeyPair(relay);

        let vote: any;

        if (type_ == EventType.EthereumEverscale) {
            const eventContract = locklift.factory.getDeployedContract(
                "EthereumEverscaleBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .confirm({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            } else {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .reject({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            }
        } else if (type_ == EventType.SolanaEverscale) {
            const eventContract = locklift.factory.getDeployedContract(
                "SolanaEverscaleBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .confirm({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            } else {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .reject({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            }
        } else if (type_ == EventType.EverscaleSolana) {
            const eventContract = locklift.factory.getDeployedContract(
                "EverscaleSolanaBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .confirm({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            } else {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .reject({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            }
        } else if (type_ == EventType.EverscaleEthereum) {
            const eventContract = locklift.factory.getDeployedContract(
                "EverscaleEthereumBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .confirm({
                        voteReceiver: eventContract_,
                        signature: ''
                    })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            } else {
                vote = locklift.transactions.waitFinalized(
                  eventContract.methods
                    .reject({ voteReceiver: eventContract_ })
                    .sendExternal({ publicKey: relay.publicKey })
                );
            }
        }

        votes.push(vote);
    }

    const txs = await Promise.all(votes);

    // for (const tx of txs) {
    //   const { traceTree } = await locklift.tracing.trace(tx.extTransaction, {
    //     raise: false,
    //   });
    //
    //   await traceTree?.beautyPrint();
    // }
}

import {Ed25519KeyPair} from "nekoton-wasm";
import {Address, Contract} from "locklift";
import {
    EthereumEverscaleBaseEventAbi,
    EverscaleEthereumBaseEventAbi, EverscaleSolanaBaseEventAbi,
    SolanaEverscaleBaseEventAbi
} from "../../build/factorySource";
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
    const eventContract = await locklift.factory.getDeployedContract(
        "EthereumEverscaleBaseEvent",
        eventContract_
    );

    const requiredVotes = await eventContract.methods
        .requiredVotes()
        .call()
        .then((t) => parseInt(t.requiredVotes, 10));

    return requiredVotes;
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
            const eventContract = await locklift.factory.getDeployedContract(
                "EthereumEverscaleBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = eventContract.methods.confirm({
                    voteReceiver: eventContract_
                }).sendExternal({publicKey: relay.publicKey});
            } else {
                vote = eventContract.methods.reject({
                    voteReceiver: eventContract_
                }).sendExternal({publicKey: relay.publicKey});
            }
        } else if (type_ == EventType.SolanaEverscale) {
            const eventContract = await locklift.factory.getDeployedContract(
                "SolanaEverscaleBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = eventContract.methods.confirm({
                    voteReceiver: eventContract_
                }).sendExternal({publicKey: relay.publicKey});
            } else {
                vote = eventContract.methods.reject({
                    voteReceiver: eventContract_
                }).sendExternal({publicKey: relay.publicKey});
            }
        } else if (type_ == EventType.EverscaleSolana) {
            const eventContract = await locklift.factory.getDeployedContract(
                "EverscaleSolanaBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = eventContract.methods.confirm({
                    voteReceiver: eventContract_,
                }).sendExternal({publicKey: relay.publicKey});
            } else {
                vote = eventContract.methods.reject({
                    voteReceiver: eventContract_,
                }).sendExternal({publicKey: relay.publicKey});
            }
        } else if (type_ == EventType.EverscaleEthereum) {
            const eventContract = await locklift.factory.getDeployedContract(
                "EverscaleEthereumBaseEvent",
                eventContract_
            );

            if (action_ == EventAction.Confirm) {
                vote = eventContract.methods.confirm({
                    voteReceiver: eventContract_,
                    signature: ''
                }).sendExternal({publicKey: relay.publicKey});
            } else {
                vote = eventContract.methods.reject({
                    voteReceiver: eventContract_,
                }).sendExternal({publicKey: relay.publicKey});
            }
        }

        votes.push(vote);
    }

    await Promise.all(votes);
}

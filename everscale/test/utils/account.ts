import {Signer, WalletTypes} from "locklift";


export const deployAccount = async function (signer: Signer, value: number) {
    const {
        account
    } = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3, // or WalletTypes.HighLoadWallet,
        //Value which will send to the new account from a giver
        value: locklift.utils.toNano(value),
        //owner publicKey
        publicKey: signer.publicKey,
    });

    return account;
};

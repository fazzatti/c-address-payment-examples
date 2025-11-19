import { Account, Keypair, MuxedAccount, xdr } from "stellar-sdk";
import { readFromJsonFile } from "../utils/io.ts";
import { config } from "../config/env.ts";
import { Settings } from "../config/settings.types.ts";
import { assembleContractAuth } from "./assemble-contract-auth.ts";

//
// Load configuration and settings
//
const { assetContractId, ioConfig } = config;
const settings = await readFromJsonFile<Settings>(ioConfig.settings);
const gAccountSigner = Keypair.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = Keypair.fromSecret(settings.mAccountSecretKey);
const smartWalletContractId = settings.smartWalletContractId;
const sourceSigner = Keypair.fromSecret(settings.sourceSecretKey);

/**
 * Used to check if the Receiver is a G-Address, M-Address or C-Address
 */
export const getReceiverArg = (toType: string): string => {
  if (toType === "g") {
    // Receiver is a G-Address
    return gAccountSigner.publicKey();
  }
  if (toType === "m") {
    // Receiver is an M-Address
    const muxedTo = new MuxedAccount(
      new Account(mAccountSigner.publicKey(), "0"),
      settings.memoId
    );
    return muxedTo.accountId();
  }
  if (toType === "c") {
    // Receiver is a C-Address
    return smartWalletContractId;
  }
  throw new Error("Invalid 'to' address type");
};

/**
 * Used to check if the Sender is a G-Address or C-Address
 * and to assemble the necessary authorization for C-Address senders.
 *
 * It also provides the keypair for the transaction source which in the
 * case of a G-address sender is the same as the sender, and in the case
 * of a C-address sender is the sourceSigner from config. The source is necessary
 * for signing the transaction.
 *
 */
export const getSenderArgs = async (
  fromType: string,
  to: string,
  amount: bigint
): Promise<{
  from: string;
  sourceKeys: Keypair;
  smartWalletAuth?: xdr.SorobanAuthorizationEntry;
}> => {
  if (fromType === "g") {
    // If the Sender is a G-Address
    return {
      from: gAccountSigner.publicKey(),
      sourceKeys: gAccountSigner,
    };
  }
  if (fromType === "c") {
    // If the Sender is a C-Address
    const from = smartWalletContractId;
    return {
      from,
      sourceKeys: sourceSigner,
      smartWalletAuth: await assembleContractAuth(
        from,
        to,
        amount,
        assetContractId
      ),
    };
  }
  throw new Error("Invalid 'from' address type");
};

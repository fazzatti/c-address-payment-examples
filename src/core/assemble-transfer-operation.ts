import { config } from "../config/env.ts";
import {
  Account,
  Address,
  Keypair,
  MuxedAccount,
  nativeToScVal,
  Operation,
  xdr,
} from "stellar-sdk";
import { TransferTypes } from "../utils/get-type-arg.ts";
import chalk from "chalk";
import { readFromJsonFile } from "../utils/io.ts";
import { Settings } from "../config/settings.types.ts";

const { assetContractId, ioConfig } = config;

const settings = await readFromJsonFile<Settings>(ioConfig.settings);

const gAccountSigner = Keypair.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = Keypair.fromSecret(settings.mAccountSecretKey);
const smartWalletContractId = settings.smartWalletContractId;
const sourceSigner = Keypair.fromSecret(settings.sourceSecretKey);

/**
 *
 * Assembles a transfer operation for the given send type.
 * Supports G-Addresses and C-Addresses as senders.
 * Supports G-Addresses, M-Addresses, and C-Addresses as receivers.
 *
 * It also provides the keypair for the transaction source which in the
 * case of a G-address sender is the same as the sender, and in the case
 * of a C-address sender is the sourceSigner from config. The source is necessary
 * to cover the network fees and also provide a sequence number for the transaction
 * so, c-address senders cannot be used for this purpose.
 */
export const assembleTransferOperation = async (
  sendType: TransferTypes,
  isViaHorizon: boolean
) => {
  const fromType = sendType.charAt(0);
  const toType = sendType.charAt(2);

  const amount: bigint = BigInt(150000000); // 15 XLM in stroops
  const to = getReceiverArg(toType);
  const { from, sourceKeys, smartWalletAuth } = await getSenderArgs(
    fromType,
    to,
    amount
  );

  const fromScVal = nativeToScVal(from, { type: "address" });
  const toScVal = nativeToScVal(to, { type: "address" });
  const amountScVal = nativeToScVal(amount.toString(), { type: "i128" });
  const transferArgsScVal = [fromScVal, toScVal, amountScVal];
  const auth: xdr.SorobanAuthorizationEntry[] = [];

  if (smartWalletAuth) auth.push(smartWalletAuth);

  if (isViaHorizon) {
    // When using Horizon, we need to add the root authorization entry manually
    const sourceAuthEntry = await assembleSourceAuthEntry(
      from,
      to,
      amount,
      assetContractId,
      sourceKeys
    );
    auth.push(sourceAuthEntry);
  }

  console.log(
    `Invoking transfer of ${chalk.green(amount)} units from ${chalk.green(
      from
    )} to ${chalk.green(to)} on contract ${chalk.green(assetContractId)}`
  );

  const operation = Operation.invokeContractFunction({
    contract: assetContractId,
    function: "transfer",
    args: transferArgsScVal,
    auth: auth,
  });

  return { operation, sourceKeys };
};

/**
 *
 * Assembles a SorobanAuthorizationEntry for a contract sender.
 * Since the bypass-auth contract does not require explicit signatures,
 * we just need to provide an authorization entry with a valid nonce and
 * expiration ledger.
 *
 * For a real smart wallet contract, you would need to sign the invocation
 * with the appropriate keys.
 *
 */
const assembleContractAuth = async (
  from: string,
  to: string,
  amount: bigint,
  assetContractId: string
): Promise<xdr.SorobanAuthorizationEntry> => {
  const { rpc } = config;

  const randomNonce = new xdr.Int64(
    Math.floor(Math.random() * 100000000000000000)
  );

  // The RPC is used here to get the latest ledger
  // for setting the signature expiration.
  // This step could be done similarly with Horizon as well.
  const latestLedger = await rpc.getLatestLedger();
  const validUntilLedgerSeq = latestLedger.sequence + 100;

  const scValAccount = nativeToScVal(from, { type: "address" });
  const assetContractAddress = new Address(assetContractId);
  const authEntry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: scValAccount.address(),
        nonce: randomNonce,
        signatureExpirationLedger: Number(validUntilLedgerSeq),
        signature: xdr.ScVal.scvVoid(), // Placeholder, no signature is required for this contract
      })
    ),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: assetContractAddress.toScAddress(),
            functionName: "transfer",
            args: [
              scValAccount,
              nativeToScVal(to, { type: "address" }),
              nativeToScVal(amount.toString(), { type: "i128" }),
            ],
          })
        ),
      subInvocations: [],
    }),
  });

  return authEntry;
};

/**
 * Assembles an authorization entry for the source account.
 * When using RPC, this is automatically handled as a result
 * of the transaction simulation.
 *
 * For Horizon, this process needs to be done manually as there
 * isn't a simulation endpoint available.
 */
const assembleSourceAuthEntry = async (
  from: string,
  to: string,
  amount: bigint,
  assetContractId: string,
  sourceKeys: Keypair
): Promise<xdr.SorobanAuthorizationEntry> => {
  const { rpc, networkConfig } = config;

  // The RPC is used here to get the latest ledger
  // for setting the signature expiration.
  // This step could be done similarly with Horizon as well.
  const latestLedger = await rpc.getLatestLedger();
  const validUntilLedgerSeq = latestLedger.sequence + 100;

  const scValAccount = nativeToScVal(from, { type: "address" });
  const assetContractAddress = new Address(assetContractId);
  const authEntry = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new xdr.InvokeContractArgs({
            contractAddress: assetContractAddress.toScAddress(),
            functionName: "transfer",
            args: [
              scValAccount,
              nativeToScVal(to, { type: "address" }),
              nativeToScVal(amount.toString(), { type: "i128" }),
            ],
          })
        ),
      subInvocations: [],
    }),
  });

  return authEntry;
};

/**
 * Used to check if the Receiver is a G-Address, M-Address or C-Address
 */
const getReceiverArg = (toType: string): string => {
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
const getSenderArgs = async (
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

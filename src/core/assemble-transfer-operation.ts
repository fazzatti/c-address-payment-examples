import { config } from "../config/env.ts";
import { nativeToScVal, Operation, xdr } from "stellar-sdk";
import { TransferTypes } from "../utils/get-type-arg.ts";
import chalk from "chalk";
import { getReceiverArg, getSenderArgs } from "./get-transfer-args.ts";
import { assembleSourceAuthEntry } from "./assemble-source-auth.ts";

const { assetContractId } = config;

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

  // Prepare the raw arguments for the transfer
  //  from(string): the sender address
  //  to(string): the receiver address
  //  amount(bigint): the amount to transfer in stroops (1 XLM = 10^7 stroops)
  const amount: bigint = BigInt(150000000); // 15 XLM
  const to = getReceiverArg(toType);
  const { from, sourceKeys, smartWalletAuth } = await getSenderArgs(
    fromType,
    to,
    amount
  );

  // Encode the raw arguments into ScVal types
  // for the contract invocation
  const fromScVal = nativeToScVal(from, { type: "address" });
  const toScVal = nativeToScVal(to, { type: "address" });
  const amountScVal = nativeToScVal(amount.toString(), { type: "i128" });
  const transferArgsScVal = [fromScVal, toScVal, amountScVal];

  // The 'auth' array will be used to include additional
  // smart contract authorization entries as needed.
  //
  // E.g. For C-Address senders, we need to include the smart wallet
  // authorization entry which authorizes the funds to be spent
  // from the smart wallet contract.
  const auth: xdr.SorobanAuthorizationEntry[] = [];

  // When assembling the sender args before, if the sender is a C-Address,
  // we already assemble and provide the smart wallet authorization
  // entry (smartWalletAuth).
  if (smartWalletAuth) auth.push(smartWalletAuth);

  // When sending via Horizon, we need to also include
  // the source account authorization entry since there is
  // no simulation step that would have added it automatically.
  //
  // The source account entry indicates that when the invocation
  // is executed, the source account (which is paying the fees)
  // authorizes the transaction. So it will accept the envelope
  // signature as the authorization for this entry requirement.
  //
  // In these examples, you can consider the case when a G-Address
  // is sending the funds and also the source account paying the fees.
  // By providing this entry, only a single signature in the envelope,
  // from the G-Address, is sufficient to authorize both the transfer
  // invocation and the transaction fee payment.
  if (isViaHorizon) {
    const sourceAuthEntry = assembleSourceAuthEntry(
      from,
      to,
      amount,
      assetContractId
    );
    auth.push(sourceAuthEntry);
  }

  console.log(
    `Invoking transfer of \n > ${chalk.green(
      amount
    )} units \n > from ${chalk.green(from)} \n > to ${chalk.green(
      to
    )} \n > on asset contract ${chalk.green(assetContractId)}`
  );

  // Assemble the invoke contract operation for the transfer
  // function on the asset contract, using the prepared arguments
  // and authorization entries.
  const operation = Operation.invokeContractFunction({
    contract: assetContractId,
    function: "transfer",
    args: transferArgsScVal,
    auth: auth,
  });

  return {
    operation,
    sourceKeys,
    contractId: assetContractId,
    from,
    to,
    amount,
  };
};

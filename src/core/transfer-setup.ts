import { Contract, ContractId, TransactionConfig } from "@colibri/core";
import { config } from "../config/env.ts";
import { nativeToScVal, xdr } from "stellar-sdk";
import chalk from "chalk";

/**
 * Simple transfer used for the setup process. For the examples, different transfer functions are used
 * to show case the transaction assembly in detail.
 *
 */
export const transferSetup = async (
  assetContractID: ContractId,
  txConfig: TransactionConfig,
  transferArgs: {
    from: string;
    to: string;
    amount: bigint;
  },
  auth?: xdr.SorobanAuthorizationEntry[]
) => {
  const { networkConfig } = config;
  const { from, to, amount } = transferArgs;

  const contract = Contract.create({
    networkConfig,
    contractConfig: {
      contractId: assetContractID,
    },
  });

  const fromScVal = nativeToScVal(from, { type: "address" });
  const toScVal = nativeToScVal(to, { type: "address" });
  const amountScVal = nativeToScVal(amount.toString(), { type: "i128" });
  const transferArgsScVal = [fromScVal, toScVal, amountScVal];

  console.log(
    `Invoking transfer of ${chalk.green(amount)} units from ${chalk.green(
      from
    )} to ${chalk.green(to)} on contract ${chalk.green(assetContractID)}`
  );
  const res = await contract.invokeRaw({
    operationArgs: {
      function: "transfer",
      args: transferArgsScVal,
      auth,
    },
    config: txConfig,
  });

  console.log("Transfer successfull:", chalk.green(res.hash));
};

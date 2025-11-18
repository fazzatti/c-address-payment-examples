import {
  Account,
  Address,
  MuxedAccount,
  nativeToScVal,
  xdr,
} from "stellar-sdk";
import { config } from "./config/env.ts";
import { getTypeArg, getTypeText } from "./utils/get-type-arg.ts";
import chalk from "chalk";
import { readFromJsonFile } from "./utils/io.ts";
import { Settings } from "./config/settings.types.ts";
import { LocalSigner, TransactionConfig } from "@colibri/core";
import { transferRpc } from "./transactions/transfer-setup.ts";

const { assetContractId, ioConfig, rpc } = config;

const sendType = getTypeArg();

console.log(
  chalk.bgBlue.bold(
    "\nSending Payment via RPC: ",
    chalk.blue(getTypeText(sendType))
  )
);

const fromType = sendType.charAt(0);
const toType = sendType.charAt(2);

const settings = await readFromJsonFile<Settings>(ioConfig.settings);

const gAccountSigner = LocalSigner.fromSecret(settings.gAccountSecretKey);
const mAccountSigner = LocalSigner.fromSecret(settings.mAccountSecretKey);
const smartWalletContractId = settings.smartWalletContractId;
const sourceSigner = LocalSigner.fromSecret(settings.sourceSecretKey);

const txConfig: TransactionConfig = {
  source: sourceSigner.publicKey(),
  fee: "100000",
  timeout: 45,
  signers: [sourceSigner],
};

let from: string | undefined = undefined;
let to: string | undefined = undefined;
const amount: bigint = BigInt(150000000); // 15 XLM in stroops

let cAuth: undefined | xdr.SorobanAuthorizationEntry;

if (toType === "g") {
  to = gAccountSigner.publicKey();
}

if (toType === "m") {
  const muxedTo = new MuxedAccount(
    new Account(mAccountSigner.publicKey(), "0"),
    settings.memoId
  );
  to = muxedTo.accountId();
}

if (toType === "c") {
  to = smartWalletContractId;
}

if (fromType === "m") {
  throw new Error(
    "M-Account as sender is not supported for contract transfers."
  );
}

if (fromType === "g") {
  from = gAccountSigner.publicKey();
  txConfig.signers.push(gAccountSigner);
}

if (fromType === "c") {
  from = smartWalletContractId;
}

if (from === undefined || to === undefined) {
  throw new Error("From or To address is not set correctly.");
}
const auth = cAuth ? [cAuth] : undefined;

await transferRpc(
  assetContractId,
  txConfig,
  {
    from,
    to,
    amount,
  },
  auth
).catch((error) => {
  console.error("Error during transfer:", error);
  // console.error(
  //   (error as SIM_ERRORS.SIMULATION_FAILED).meta.data.input.transaction.toXDR()
  // );
  Deno.exit(1);
});

import { config } from "./config/env.ts";
import {
  LocalSigner,
  initializeWithFriendbot,
  Contract,
  TransactionConfig,
  ContractId,
  Ed25519PublicKey,
  Ed25519SecretKey,
} from "@colibri/core";
import { loadWasmFile } from "./utils/load-wasm.ts";
import { transferSetup } from "./transactions/transfer-setup.ts";
import { Asset, Keypair } from "stellar-sdk";
import chalk from "chalk";
import { saveToJsonFile } from "./utils/io.ts";
import { Settings } from "./config/settings.types.ts";

const { networkConfig, wasmDir, ioConfig } = config;

const tempAcc = LocalSigner.generateRandom();
const sourceAcc = Keypair.random();
const gUser = Keypair.random();
const mUser = Keypair.random();

const memoId = "1234567890123422222";

console.log(chalk.bgBlue.black("Starting setup..."));

console.log(
  chalk.gray(
    `Initializing account to fund the Smart Wallet: ${chalk.green(
      tempAcc.publicKey()
    )}`
  )
);

await initializeWithFriendbot(
  networkConfig.friendbotUrl as string,
  tempAcc.publicKey()
);

console.log(
  chalk.gray(
    `Initializing account to act as source for transactions: ${chalk.green(
      sourceAcc.publicKey()
    )}`
  )
);

await initializeWithFriendbot(
  networkConfig.friendbotUrl as string,
  sourceAcc.publicKey() as Ed25519PublicKey
);

console.log(
  chalk.gray(
    `Initializing account for pure G-Account example: ${chalk.green(
      gUser.publicKey()
    )}`
  )
);

await initializeWithFriendbot(
  networkConfig.friendbotUrl as string,
  gUser.publicKey() as Ed25519PublicKey
);

console.log(
  chalk.gray(
    `Initializing account for Muxed Address example: ${chalk.green(
      mUser.publicKey()
    )}`
  )
);

await initializeWithFriendbot(
  networkConfig.friendbotUrl as string,
  mUser.publicKey() as Ed25519PublicKey
);

const txConfig: TransactionConfig = {
  source: tempAcc.publicKey(),
  fee: "10000",
  signers: [tempAcc],
  timeout: 45,
};

console.log(chalk.gray("Loading contract WASM file..."));
const contractWasmPath = `${wasmDir}auth_bypass.wasm`;
const wasm = await loadWasmFile(contractWasmPath);

const contract = Contract.create({
  networkConfig,
  contractConfig: {
    wasm,
  },
});

console.log(chalk.gray("Uploading contract to the network..."));
const uploadRes = await contract.uploadWasm(txConfig);
console.log(`WASM uploaded: ${uploadRes.hash}`);
console.log(`Contract wasm hash ${chalk.green(contract.getWasmHash())}`);

console.log(chalk.gray(chalk.gray("Deploying contract...")));
const deployRes = await contract.deploy({
  config: txConfig,
});
console.log(`Contract deployed: ${deployRes.hash}`);
console.log(`Contract ID: ${chalk.green(contract.getContractId())}`);

console.log(chalk.gray("Sending 9000 XLM to the contract address..."));
await transferSetup(
  Asset.native().contractId(networkConfig.networkPassphrase) as ContractId,
  txConfig,
  {
    from: tempAcc.publicKey(),
    to: contract.getContractId(),
    amount: BigInt(9000 * 1e7),
  }
);

console.log(chalk.gray("Using Memo Id: " + chalk.green(memoId)));

await saveToJsonFile<Settings>(
  {
    smartWalletContractId: contract.getContractId(),
    gAccountSecretKey: gUser.secret() as Ed25519SecretKey,
    mAccountSecretKey: mUser.secret() as Ed25519SecretKey,
    sourceSecretKey: sourceAcc.secret() as Ed25519SecretKey,
    memoId: memoId,
  },
  ioConfig.settings
);

console.log(chalk.bgBlue.black("Setup complete! Saving settings..."));

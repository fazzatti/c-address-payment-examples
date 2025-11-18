import { Asset, Horizon } from "stellar-sdk";
import { ContractId, TestNet } from "@colibri/core";
import { Server } from "stellar-sdk/rpc";

const networkConfig = TestNet();

export const getRpc = () => {
  return new Server(networkConfig.rpcUrl as string, { allowHttp: true });
};

export const getHorizon = () => {
  return new Horizon.Server(networkConfig.horizonUrl as string);
};

export const config = {
  networkConfig: networkConfig,
  assetContractId: Asset.native().contractId(
    networkConfig.networkPassphrase
  ) as ContractId,
  rpc: getRpc(),
  horizon: getHorizon(),
  wasmDir: "./target/wasm32v1-none/release/",
  ioConfig: {
    outputDirectory: "./.json",
    settings: "settings",
  },
};

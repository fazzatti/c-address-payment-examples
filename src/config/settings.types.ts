import { ContractId, Ed25519SecretKey } from "@colibri/core";

export type Settings = {
  smartWalletContractId: ContractId;
  gAccountSecretKey: Ed25519SecretKey;
  mAccountSecretKey: Ed25519SecretKey;
  sourceSecretKey: Ed25519SecretKey;
  memoId: string;
};

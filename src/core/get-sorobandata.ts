import { StrKey } from "@colibri/core";
import {
  Address,
  Keypair,
  MuxedAccount,
  SorobanDataBuilder,
  xdr,
} from "stellar-sdk";

export const getSorobanData = (
  contractId: string,
  from: string,
  to: string
): xdr.SorobanTransactionData => {
  const contractInstanceLedgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: Address.fromString(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );

  const senderKey = ledgerKeyFromAddress(from, contractId);

  const readEntries = [contractInstanceLedgerKey];
  const readWriteEntries = [senderKey];

  if (to !== from) {
    const receiverKey = ledgerKeyFromAddress(to, contractId);
    readWriteEntries.push(receiverKey);
  }

  // Fixed resource values for this example
  // based on the average SAC transfer
  const cpuInstructions = 285237;
  const readBytes = 288;
  const writeBytes = 368;
  const resourceFee = 92472;

  const sorobanData = new SorobanDataBuilder()
    .appendFootprint(readEntries, readWriteEntries)
    .setResources(cpuInstructions, readBytes, writeBytes)
    .setResourceFee(resourceFee)
    .build();

  return sorobanData;
};

const ledgerKeyFromAddress = (
  address: string,
  contractId: string
): xdr.LedgerKey => {
  if (StrKey.isEd25519PublicKey(address)) {
    return xdr.LedgerKey.account(
      new xdr.LedgerKeyAccount({
        accountId: Keypair.fromPublicKey(address).xdrAccountId(),
      })
    );
  }

  if (StrKey.isContractId(address)) {
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(contractId).toScAddress(),
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol("Balance"),
          xdr.ScVal.scvAddress(Address.fromString(address).toScAddress()),
        ]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }

  if (StrKey.isMuxedAddress(address)) {
    return xdr.LedgerKey.account(
      new xdr.LedgerKeyAccount({
        accountId: Keypair.fromPublicKey(
          MuxedAccount.fromAddress(address, "0").baseAccount().accountId()
        ).xdrAccountId(),
      })
    );
  }

  throw new Error("Unsupported address type");
};

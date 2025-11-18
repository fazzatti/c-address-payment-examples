import {
  Address,
  authorizeEntry,
  Keypair,
  nativeToScVal,
  Transaction,
  xdr,
  XdrLargeInt,
} from "stellar-sdk";
import { config } from "../config/env.ts";

const addRootEntryAuth = async (
  op: xdr.Operation,
  sourceKeys: Keypair
): xdr.Operation => {
  const authEntry = await assembleRootAuth();
};

const assembleRootAuth = async (
  from: string,
  to: string,
  amount: bigint,
  assetContractId: string,
  sourceKeys: Keypair
): Promise<xdr.SorobanAuthorizationEntry> => {
  const { rpc, networkConfig } = config;

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

  const signedEntry = await authorizeEntry(
    authEntry,
    sourceKeys,
    validUntilLedgerSeq,
    networkConfig.networkPassphrase
  );

  return signedEntry;
};

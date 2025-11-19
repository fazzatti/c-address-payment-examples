import { Address, nativeToScVal, xdr } from "stellar-sdk";
import { config } from "../config/env.ts";

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
export const assembleContractAuth = async (
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

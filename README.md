# DEMO: SAC Payments and Ingestion

This repo contains a few different use cases to demonstrate how to perform payments with Stellar assets to C-Addresses (Smart Wallets and other Contracts), as well as monitoring a variaty of incoming payments also involving a contract invocation.

## Prerequisites

- [Deno](https://deno.land/) runtime installed
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) installed
- [Soroban setup](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup) completed

These demos are set to use:

- **Network:** `testnet` only
- **Asset:** Native `XLM` through the [SAC Contract](https://developers.stellar.org/docs/tokens/stellar-asset-contract).
- **Config:** As part of the setup executed under [setup > step 2](#setup), the following items are prepared and stored in a config file.
  - **G-Address:** A normal keypair used to represent a comon native Stellar account.
  - **C-Address:** A Contract address of a demo Smart Wallet.
  - **M-Address:** Another keypair used to control a [pooled account](https://developers.stellar.org/docs/build/guides/transactions/pooled-accounts-muxed-accounts-memos) encoded with an id.
  - **Memo ID:** The id used to encode the M-Address.

## Setup

1. To build the smart contract simulating a Smart Wallet with bypassed auth, run the following command:

   ```bash
   stellar contract build
   ```

   This should compile the contract and generate the binaries in a WASM file under the target directory.

   >

2. To setup the accounts and contract instance on-chain, run the setup script with:

   ```ts
   deno task setup
   ```

   This step generates a `settings.json` file under the `./.json` directory, containing the keys for the demo accounts, the contract id of the c-address and the memo id.

Alternatively, you can run the command `deno task full-setup` which will sequentially execute steps 1 and 2.

## Monitoring Payments

After running the [setup](#setup), it is possible to start a streaming process that will monitor for incoming payments involving specific accounts and then "processing" these payments by console logging the details. There are two versions of this process, highlighting the approaches of using the RPC server versus the Horizon API.

### Using the Stellar RPC

To start the ingestion via RPC, run the following command:

```bash
deno task ingest:rpc
```

The process will immediately start to process each new ledger and identify contract events issued by the following accounts defined in the configuration file:

- G-Address
- M-Address's underlying G-Address
- C-Address
  The entry point for this process is the file under [./src/ingest-events-rpc.ts](src/ingest-events-rpc.ts).

### Using the Horizon API

To start the ingestion via RPC, run the following command:

```bash
deno task ingest:horizon
```

The process will immediately start to process new payments in which the receiving address is one of the following accounts defined in the configuration file:

- G-Address
- M-Address's underlying G-Address

The entry point for this process is the file under [/src/ingest-payments-horizon.ts](src/ingest-payments-horizon.ts).

## Sending Payments through the SAC

To send payments with the SAC contract, we make use of the `InvokeHostFunctionOp` to invoke the `transfer` function of the XLM contract. This type of operation differs from normal `payment` operations, still the process to assemble it is mostly the same when using the RPC or Horizon to send the transaction. The process to assemble it can be seen in detail under [./src/core//assemble-transfer-operation.ts](src/core//assemble-transfer-operation.ts).

There are two different scripts demonstrating how to assemble and execute this payment via both Stellar RPC and the Horizon API.

### Using the Stellar RPC

To send the payment through the Stellar RPC, run the following command:

```bash
deno task send:rpc <TYPE ARG>
```

This command expects an additional 'type' argument to indicate how this payment should be configured. The supported values are the following:

- `g2g`: Assembles a SAC `transfer` invocation from the **G-Address** to the **G-Address**
- `g2m`: Assembles a SAC `transfer` invocation from the **G-Address** to the **M-Address**
- `g2c`: Assembles a SAC `transfer` invocation from the **G-Address** to the **C-Address**
- `c2g`: Assembles a SAC `transfer` invocation from the **C-Address** to the **G-Address**
- `c2m`: Assembles a SAC `transfer` invocation from the **C-Address** to the **M-Address**
- `c2c`: Assembles a SAC `transfer` invocation from the **C-Address** to the **C-Address**

The entry point for this script is the file under [/src/send-rpc.ts](src/send-rpc.ts).

**Key Characteristics:**
Since the RPC provides a `simulateTransaction` endpoint, the operation can be assembled with minimal arguments. Once the transaction is simulated, the object is then automatically populated with additional information about this invocation, such as the footprint, resources and resource fee.

### Using the Horizon API

To send the payment through the Horizon API, run the following command:

```bash
deno task send:horizon <TYPE ARG>
```

This command expects an additional 'type' argument to indicate how this payment should be configured. The supported values are the following:

- `g2g`: Assembles a SAC `transfer` invocation from the **G-Address** to the **G-Address**
- `g2m`: Assembles a SAC `transfer` invocation from the **G-Address** to the **M-Address**
- `g2c`: Assembles a SAC `transfer` invocation from the **G-Address** to the **C-Address**

The entry point for this script is the file under [/src/send-horizon.ts](src/send-horizon.ts).

**Key Characteristics:**
Since the Horizon **does not** provide a simulation endpoint, the operation requires the `sorobanData` to be manually assembled and appended to the transaction object. This requires estimating the resources and other parameters related to the invocation execution.

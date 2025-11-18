#

##

- Runs in testnet

## Prerequisites

- [Deno](https://deno.land/) runtime installed
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) installed
- [Soroban setup](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup) completed
- Access to Stellar Testnet (configured via environment variables)

## Setup

1. To build the smart contract simulating a Smart Wallet with bypassed auth, run the following command:

```bash
stellar contract build
```

This should compile the contract and generate the binaries in a WASM file under the target directory.

2. To setup the accounts and contract instance on-chain, run the setup script with:

```js
deno task setup
```

This step generates a `settings.json` file under the `./.json` directory, containing the keys for the demo accounts, the contract id of the c-address and the memo id.

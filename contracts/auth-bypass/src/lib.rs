#![no_std]

use soroban_sdk::{
    auth::{Context, CustomAccountInterface},
    contract, contracterror, contractimpl,
    crypto::Hash,
    Env, Vec,
};

#[contract]
pub struct AuthBypassContract;

#[contractimpl]
impl CustomAccountInterface for AuthBypassContract {
    type Error = AuthError;
    type Signature = ();

    fn __check_auth(
        _e: Env,
        _payload: Hash<32>,
        _signatures: (),
        _contexts: Vec<Context>,
    ) -> Result<(), AuthError> {
        // Bypass all auth checks
        Ok(())
    }
}

#[contracterror]
#[derive(Copy, Clone, Eq, PartialEq, Debug)]
#[repr(u32)]
pub enum AuthError {
    Error = 1,
}

## Functional Requirements:

1. The contract must allow the contract owner to add a vesting schedule with a Merkle root and deposit the vested tokens.
2. The contract must allow users to initialize their vestings using Merkle proofs.
3. Users should be able to add new vestings to their account by providing valid data against the Merkle root.
4. The contract should calculate the total vested amount and update the user's vested balance accordingly after validating the data.
5. The contract should prevent users from performing a transaction without adding any new vesting.

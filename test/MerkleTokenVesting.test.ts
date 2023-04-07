import { waffle } from "hardhat";
import { expect } from "chai";

import MerkleTokenVestingArtifacts from "../artifacts/contracts/MerkleTokenVesting.sol/MerkleTokenVesting.json";
import ERC20MockArtifact from "../artifacts/contracts/mocks/ERC20Mock.sol/ERC20Mock.json";

import { MerkleTokenVesting, ERC20Mock } from "../typechain";
import { Wallet, BigNumber } from "ethers";
import { getBigNumber, latest, advanceTimeAndBlock } from "./utilities";
const { provider, deployContract } = waffle;

import { getMerkle } from "./utilities/merkle";

// Error codes
const Error_TokenZeroAddress: string = "Error_TokenZeroAddress()";
const Error_InvalidPercents: string = "Error_InvalidPercents()";
const Error_InvalidProof: string = "Error_InvalidProof()";
const Error_NothingToVest: string = "Error_NothingToVest()";
const Error_IdZero: string = "Error_IdZero()";
const Error_RootZero: string = "Error_RootZero()";
const Error_InvalidRecurrences: string = "Error_InvalidRecurrences()";
const Error_NothingToClaim: string = "Error_NothingToClaim()";
const Error_InvalidData: string = "Error_InvalidData()";
const Error_RootAdded: string = "Error_RootAdded()";
const Error_Allowance: string = "ERC20: insufficient allowance";

// Event names
const VESTED_EVENT: string = "Vested";
const CLAIMED_EVENT: string = "Claimed";
const TRANSFER_EVENT: string = "Transfer";

// Constants
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MONTH = 30 * 24 * 60 * 60;

describe("VestingLinear", () => {
  const [deployer, alice, bob, carol, don] = provider.getWallets() as Wallet[];

  let vesting: MerkleTokenVesting;
  let token: ERC20Mock;

  let now: BigNumber;

  const id = 1;

  const startDelay = 1800;
  const cliffDuration = 3600;
  const recurrences = 12;
  const startBPS = 1500;

  const vestings = [
    { address: alice.address, amount: getBigNumber(10_000) },
    { address: bob.address, amount: getBigNumber(5_000) },
    { address: alice.address, amount: getBigNumber(23_500) },
    { address: carol.address, amount: getBigNumber(1_111) },
    { address: bob.address, amount: getBigNumber(10_000) },
    { address: alice.address, amount: getBigNumber(10_000) },
  ];

  const merkle = getMerkle(vestings);

  const merkle_incorrect = {
    index: 3,
    amount: "2500000",
    proof: [
      "0xa06358136008cb8bdf553402c49c5a202ce139106585dd06d5af403776f025ff",
      "0xd2a5cf3dccf4510596aaacf3f2ef4fd5f5c149b1262bcf89f65574fbe992e1a1",
    ],
  };

  beforeEach(async () => {
    token = (await deployContract(deployer, ERC20MockArtifact, [
      "Vested",
      "VT",
      18,
      getBigNumber(25000000),
    ])) as ERC20Mock;
    vesting = (await deployContract(deployer, MerkleTokenVestingArtifacts, [token.address])) as MerkleTokenVesting;

    now = await latest();

    await token.approve(vesting.address, merkle.total);

    await vesting.addVestingSchedule(
      id,
      now.add(startDelay),
      cliffDuration,
      recurrences,
      startBPS,
      merkle.root,
      merkle.total
    );
  });

  describe("constructor", () => {
    it("should revert when token address is 0", async function () {
      await expect(deployContract(deployer, MerkleTokenVestingArtifacts, [ZERO_ADDRESS])).to.be.revertedWith(
        Error_TokenZeroAddress
      );
    });

    it("should deploy as expected", async function () {
      const _vesting = (await deployContract(deployer, MerkleTokenVestingArtifacts, [
        token.address,
      ])) as MerkleTokenVesting;

      expect(await _vesting.vestedToken()).to.equal(token.address);
      expect(await _vesting.owner()).to.equal(deployer.address);
    });
  });

  describe("addVestingSchedule", () => {
    let _vesting: MerkleTokenVesting;

    beforeEach(async () => {
      _vesting = (await deployContract(deployer, MerkleTokenVestingArtifacts, [token.address])) as MerkleTokenVesting;
    });

    it("should revert when vesting schedule id is zero", async function () {
      await expect(
        _vesting.addVestingSchedule(
          0,
          now.add(startDelay),
          cliffDuration,
          recurrences,
          startBPS,
          merkle.root,
          merkle.total
        )
      ).to.be.revertedWith(Error_IdZero);
    });

    it("should revert when merkle root is zero", async function () {
      await expect(
        _vesting.addVestingSchedule(
          id,
          now.add(startDelay),
          cliffDuration,
          recurrences,
          startBPS,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          merkle.total
        )
      ).to.be.revertedWith(Error_RootZero);
    });

    it("should revert when startBPS > 100%", async function () {
      await expect(
        _vesting.addVestingSchedule(
          id,
          now.add(startDelay),
          cliffDuration,
          recurrences,
          10001,
          merkle.root,
          merkle.total
        )
      ).to.be.revertedWith(Error_InvalidPercents);
    });

    it("should revert when recurrences == 0", async function () {
      await expect(
        _vesting.addVestingSchedule(id, now.add(startDelay), cliffDuration, 0, startBPS, merkle.root, merkle.total)
      ).to.be.revertedWith(Error_InvalidRecurrences);
    });

    it("should revert when merkle root was already added for vesting schedule", async function () {
      await token.approve(_vesting.address, merkle.total);
      await _vesting.addVestingSchedule(
        id,
        now.add(startDelay),
        cliffDuration,
        recurrences,
        startBPS,
        merkle.root,
        merkle.total
      );

      await expect(
        _vesting.addVestingSchedule(
          id,
          now.add(startDelay),
          cliffDuration,
          recurrences,
          startBPS,
          merkle.root,
          merkle.total
        )
      ).to.be.revertedWith(Error_RootAdded);
    });

    it("should revert with transfer failed when there was no approve", async function () {
      await expect(
        _vesting.addVestingSchedule(
          id,
          now.add(startDelay),
          cliffDuration,
          recurrences,
          startBPS,
          merkle.root,
          merkle.total
        )
      ).to.be.revertedWith(Error_Allowance);
    });

    it("should add vesting schedule correctly", async function () {
      await token.approve(_vesting.address, merkle.total);
      await _vesting.addVestingSchedule(
        id,
        now.add(startDelay),
        cliffDuration,
        recurrences,
        startBPS,
        merkle.root,
        merkle.total
      );

      expect(await _vesting.vestings(id)).to.deep.equal([
        now.add(startDelay).toNumber(),
        cliffDuration,
        now
          .add(startDelay)
          .add(cliffDuration)
          .add(recurrences * MONTH)
          .toNumber(),
        recurrences,
        startBPS,
      ]);
      expect(await _vesting.merkleRoots(id)).to.equal(merkle.root);
      expect(await token.balanceOf(_vesting.address)).to.equal(merkle.total);
    });
  });

  describe("initVestings", () => {
    it("should revert when array lengths are invalid", async function () {
      await expect(
        vesting.initVestings(
          id,
          alice.address,
          [merkle_incorrect.index],
          [merkle_incorrect.amount, merkle_incorrect.amount],
          [merkle_incorrect.proof]
        )
      ).to.be.revertedWith(Error_InvalidData);

      await expect(
        vesting.initVestings(
          id,
          alice.address,
          [merkle_incorrect.index],
          [merkle_incorrect.amount],
          [merkle_incorrect.proof, merkle_incorrect.proof]
        )
      ).to.be.revertedWith(Error_InvalidData);
    });

    it("should revert with invalid proof when invalid proof provided for existing vesting schedule", async function () {
      await expect(
        vesting.initVestings(
          id,
          alice.address,
          [merkle_incorrect.index],
          [merkle_incorrect.amount],
          [merkle_incorrect.proof]
        )
      ).to.be.revertedWith(Error_InvalidProof);
    });

    it("should revert with nothing to vest for user without proofs", async function () {
      await expect(vesting.initVestings(id, don.address, [], [], [])).to.be.revertedWith(Error_NothingToVest);
    });

    it("should revert with nothing to vest for reused proofs", async function () {
      await vesting.initVestings(
        id,
        carol.address,
        merkle.accounts[carol.address].indexes,
        merkle.accounts[carol.address].amounts,
        merkle.accounts[carol.address].proofs
      );

      await expect(
        vesting.initVestings(
          id,
          carol.address,
          merkle.accounts[carol.address].indexes,
          merkle.accounts[carol.address].amounts,
          merkle.accounts[carol.address].proofs
        )
      ).to.be.revertedWith(Error_NothingToVest);
    });

    it("should revert with invalid proof when proofs provided for not existing vesting schedule", async function () {
      await expect(
        vesting.initVestings(
          2,
          carol.address,
          merkle.accounts[carol.address].indexes,
          merkle.accounts[carol.address].amounts,
          merkle.accounts[carol.address].proofs
        )
      ).to.be.revertedWith(Error_InvalidProof);
    });

    it("should correctly init vestings when all proofs provided", async function () {
      await expect(
        vesting.initVestings(
          id,
          carol.address,
          merkle.accounts[carol.address].indexes,
          merkle.accounts[carol.address].amounts,
          merkle.accounts[carol.address].proofs
        )
      )
        .to.emit(vesting, VESTED_EVENT)
        .withArgs(
          id,
          carol.address,
          merkle.accounts[carol.address].indexes[0],
          merkle.accounts[carol.address].amounts[0]
        );
    });

    it("should correctly init missing vestings when all proofs provided", async function () {
      await vesting.initVestings(
        id,
        alice.address,
        [merkle.accounts[alice.address].indexes[0]],
        [merkle.accounts[alice.address].amounts[0]],
        [merkle.accounts[alice.address].proofs[0]]
      );

      await expect(
        vesting.initVestings(
          id,
          alice.address,
          merkle.accounts[alice.address].indexes,
          merkle.accounts[alice.address].amounts,
          merkle.accounts[alice.address].proofs
        )
      )
        .to.emit(vesting, VESTED_EVENT)
        .withArgs(
          id,
          alice.address,
          merkle.accounts[alice.address].indexes[1],
          merkle.accounts[alice.address].amounts[1]
        )
        .and.to.emit(vesting, VESTED_EVENT)
        .withArgs(
          id,
          alice.address,
          merkle.accounts[alice.address].indexes[2],
          merkle.accounts[alice.address].amounts[2]
        );
    });
  });

  describe("claim", () => {
    it("should revert with nothing to claim when claiming for not existing schedule id", async () => {
      await expect(vesting.connect(alice).claim(2)).to.be.revertedWith(Error_NothingToClaim);
    });

    it("should revert with nothing to claim when claiming for not eligible user", async () => {
      await expect(vesting.connect(don).claim(1)).to.be.revertedWith(Error_NothingToClaim);
    });

    it("should revert with nothing to claim when claiming before startTime", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      await expect(vesting.connect(alice).claim(id)).to.be.revertedWith(Error_NothingToClaim);
    });

    it("should correctly claim start tokens after start and before cliff", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      await advanceTimeAndBlock(startDelay);

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(6525));
    });

    it("should correctly claim start tokens after start and before cliff, when vestings initialized in parts", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        [merkle.accounts[alice.address].indexes[0]],
        [merkle.accounts[alice.address].amounts[0]],
        [merkle.accounts[alice.address].proofs[0]]
      );

      await advanceTimeAndBlock(startDelay);

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(1500))
        .and.to.emit(token, TRANSFER_EVENT)
        .withArgs(vesting.address, alice.address, getBigNumber(1500));

      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(5025));
    });

    it("should correctly claim all vested tokens after vesting end", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + recurrences * MONTH + 1);

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(43500));
    });

    it("should correctly claim all vested tokens after vesting end, when vestings initialized in parts", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        [merkle.accounts[alice.address].indexes[1]],
        [merkle.accounts[alice.address].amounts[1]],
        [merkle.accounts[alice.address].proofs[1]]
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + recurrences * MONTH + 1);

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(23500));

      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(20000));
    });

    it("should correctly claim tokens in the middle of the vesting", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + 2 * MONTH + 123);

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, getBigNumber(6525).add(getBigNumber(308125, 16).mul(2)));
    });

    it("should correctly claim tokens in the middle of the vesting, when vestings initialized in parts", async () => {
      await vesting.initVestings(
        id,
        alice.address,
        [merkle.accounts[alice.address].indexes[2]],
        [merkle.accounts[alice.address].amounts[2]],
        [merkle.accounts[alice.address].proofs[2]]
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + 2 * MONTH + 123);

      const claimable_2_month_one_proof = getBigNumber(1500).add(BigNumber.from("708333333333333333333").mul(2));

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, claimable_2_month_one_proof);

      await vesting.initVestings(
        id,
        alice.address,
        merkle.accounts[alice.address].indexes,
        merkle.accounts[alice.address].amounts,
        merkle.accounts[alice.address].proofs
      );

      const claimable_2_month_all_proofs = getBigNumber(6525).add(getBigNumber(308125, 16).mul(2));

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, claimable_2_month_all_proofs.sub(claimable_2_month_one_proof));

      await advanceTimeAndBlock(12 * MONTH);

      const claimable_14_month_all_proofs = getBigNumber(43500);

      await expect(vesting.connect(alice).claim(id))
        .to.emit(vesting, CLAIMED_EVENT)
        .withArgs(id, alice.address, claimable_14_month_all_proofs.sub(claimable_2_month_all_proofs));
    });
  });

  describe("getClaimable", () => {
    it("should return 0 if nothing to claim for not initialized vesting", async function () {
      const actual = (await vesting.getClaimable(id, bob.address)).toNumber();
      expect(actual).to.be.equal(0);
    });

    it("should return 0 for not existing vesting schedule", async function () {
      const actual = (await vesting.getClaimable(2, bob.address)).toNumber();
      expect(actual).to.be.equal(0);
    });

    it("should return 0 if nothing to claim for correct and initialized vesting, before start time", async function () {
      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      const actual = (await vesting.getClaimable(id, bob.address)).toNumber();
      expect(actual).to.be.equal(0);
    });

    it("should return 0 if nothing to claim for incorrect user", async function () {
      const actual = (await vesting.getClaimable(id, don.address)).toNumber();
      expect(actual).to.be.equal(0);
    });

    it("should correctly return claimable start tokens after start and before cliff", async () => {
      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      await advanceTimeAndBlock(startDelay);

      const actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(getBigNumber(2250));
    });

    it("should correctly return claimable start tokens after start and before cliff, when vestings initialized in parts", async () => {
      await vesting.initVestings(
        id,
        bob.address,
        [merkle.accounts[bob.address].indexes[0]],
        [merkle.accounts[bob.address].amounts[0]],
        [merkle.accounts[bob.address].proofs[0]]
      );

      await advanceTimeAndBlock(startDelay);

      let actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(getBigNumber(750));

      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(getBigNumber(2250));
    });

    it("should correctly return claimable tokens after vesting end", async () => {
      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + recurrences * MONTH + 1);

      const actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(getBigNumber(15000));
    });

    it("should correctly return claimable tokens after vesting end, when vestings initialized in parts", async () => {
      await vesting.initVestings(
        id,
        bob.address,
        [merkle.accounts[bob.address].indexes[1]],
        [merkle.accounts[bob.address].amounts[1]],
        [merkle.accounts[bob.address].proofs[1]]
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + recurrences * MONTH + 1);

      let actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(getBigNumber(10000));

      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(getBigNumber(15000));
    });

    it("should correctly return claimable tokens in the middle of the vesting", async () => {
      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + 2 * MONTH + 123);

      const claimable = getBigNumber(2250).add(getBigNumber(10625, 17).mul(2));

      const actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(claimable);
    });

    it("should correctly return claimable tokens in the middle of the vesting, when vestings initialized in parts", async () => {
      await vesting.initVestings(
        id,
        bob.address,
        [merkle.accounts[bob.address].indexes[0]],
        [merkle.accounts[bob.address].amounts[0]],
        [merkle.accounts[bob.address].proofs[0]]
      );

      await advanceTimeAndBlock(startDelay + cliffDuration + 2 * MONTH + 123);

      const claimable_2_month_one_proof = getBigNumber(750).add(BigNumber.from("354166666666666666666").mul(2));

      let actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(claimable_2_month_one_proof);

      await vesting.initVestings(
        id,
        bob.address,
        merkle.accounts[bob.address].indexes,
        merkle.accounts[bob.address].amounts,
        merkle.accounts[bob.address].proofs
      );

      const claimable_2_month_all_proofs = getBigNumber(2250).add(getBigNumber(10625, 17).mul(2));

      actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(claimable_2_month_all_proofs);

      await advanceTimeAndBlock(12 * MONTH);

      const claimable_14_month_all_proofs = getBigNumber(15000);

      actual = await vesting.getClaimable(id, bob.address);
      expect(actual).to.be.equal(claimable_14_month_all_proofs);
    });
  });
});

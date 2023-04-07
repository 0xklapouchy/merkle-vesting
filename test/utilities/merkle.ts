import { BigNumber } from "ethers";
import BalanceTree from "./merkle-tree/balance-tree";

interface MerkleDistributorInfo {
  root: string;
  total: string;
  accounts: {
    [account: string]: {
      indexes: number[];
      amounts: string[];
      proofs: string[][];
    };
  };
}

type VestingData = { address: string; amount: BigNumber };

export function getMerkle(vestings: VestingData[]): MerkleDistributorInfo {
  // construct a tree
  const tree = new BalanceTree(vestings.map(vesting => ({ account: vesting.address, amount: vesting.amount })));

  // generate claims
  const accounts = vestings.reduce<{
    [address: string]: { indexes: number[]; amounts: string[]; proofs: string[][] };
  }>((memo, vesting, index) => {
    if (memo[vesting.address]) {
      memo[vesting.address].indexes.push(index);
      memo[vesting.address].amounts.push(vesting.amount.toString());
      memo[vesting.address].proofs.push(tree.getProof(index, vesting.address, vesting.amount));
    } else {
      memo[vesting.address] = {
        indexes: [index],
        amounts: [vesting.amount.toString()],
        proofs: [tree.getProof(index, vesting.address, vesting.amount)],
      };
    }

    return memo;
  }, {});

  const tokenTotal: BigNumber = vestings.reduce<BigNumber>(
    (memo, vesting) => memo.add(vesting.amount),
    BigNumber.from(0)
  );

  return {
    root: tree.getHexRoot(),
    total: tokenTotal.toString(),
    accounts,
  };
}

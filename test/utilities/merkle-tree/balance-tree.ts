import MerkleTree from "./merkle-tree";
import { BigNumber } from "ethers";
import { defaultAbiCoder, keccak256, solidityPack } from "ethers/lib/utils";

export default class BalanceTree {
  private readonly tree: MerkleTree;
  constructor(balances: { account: string; amount: BigNumber }[]) {
    this.tree = new MerkleTree(
      balances.map(({ account, amount }, index) => {
        return BalanceTree.toNode(index, account, amount);
      })
    );
  }

  public static verifyProof(
    index: number | BigNumber,
    account: string,
    amount: BigNumber,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(index, account, amount);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  // keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
  public static toNode(index: number | BigNumber, account: string, amount: BigNumber): Buffer {
    const encoded = defaultAbiCoder.encode(["uint256", "address", "uint256"], [index, account, amount]);
    const hash1 = keccak256(encoded);
    const hash2 = keccak256(solidityPack(["bytes32"], [hash1]));
    return Buffer.from(hash2.substr(2), "hex");
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  public getProof(index: number | BigNumber, account: string, amount: BigNumber): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(index, account, amount));
  }
}

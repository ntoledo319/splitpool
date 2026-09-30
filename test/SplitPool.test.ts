import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

describe("SplitPool", () => {
  let viem, pool, alice, bob, carol, publicClient;

  before(async () => {
    ({ viem } = await network.connect());
    [alice, bob, carol] = await viem.getWalletClients();
    publicClient = await viem.getPublicClient();
    pool = await viem.deployContract("SplitPool");
  });

  async function tx(p) {
    const hash = await p;
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  it("creates a pool and creator auto-joins", async () => {
    await tx(pool.write.createPool(["weekend trip"], { account: alice.account }));
    const p = await pool.read.pools([0n]);
    assert.equal(p[0], "weekend trip");
    assert.equal(getAddress(p[1]), getAddress(alice.account.address));
    assert.equal(await pool.read.isMember([0n, alice.account.address]), true);
  });

  it("lets others join", async () => {
    for (const c of [bob, carol]) {
      await tx(pool.write.joinPool([0n], { account: c.account }));
    }
    const members = await pool.read.membersOf([0n]);
    assert.equal(members.length, 3);
  });

  it("splits an expense evenly and nets balances", async () => {
    // alice paid 3 MON off-chain for all three -> 1 each
    await tx(
      pool.write.recordExpense(
        [0n, alice.account.address, [alice.account.address, bob.account.address, carol.account.address], parseEther("3"), "dinner"],
        { account: alice.account }
      )
    );
    assert.equal(await pool.read.netBalance([0n, alice.account.address]), parseEther("2"));
    assert.equal(await pool.read.netBalance([0n, bob.account.address]), parseEther("-1"));
    assert.equal(await pool.read.netBalance([0n, carol.account.address]), parseEther("-1"));
  });

  it("blocks withdrawals while the pool holds no settlements", async () => {
    await assert.rejects(
      pool.write.withdrawCredits([0n], { account: alice.account }),
      /pool not funded yet/
    );
  });

  it("settles a debtor who pays what they owe, refunding overpay", async () => {
    await tx(pool.write.settle([0n], { account: bob.account, value: parseEther("1.5") }));
    assert.equal(await pool.read.netBalance([0n, bob.account.address]), 0n);
    const p = await pool.read.pools([0n]);
    assert.equal(p[5], parseEther("1")); // totalSettled counts only the owed amount
  });

  it("lets the creditor withdraw once settlements land", async () => {
    // only bob settled (1 MON) so alice can pull 1 of her 2 now
    const balBefore = await publicClient.getBalance({ address: alice.account.address });
    const hash = await tx(pool.write.withdrawCredits([0n], { account: alice.account }));
    const receipt = await publicClient.getTransactionReceipt({ hash });
    const gas = receipt.gasUsed * receipt.effectiveGasPrice;
    const balAfter = await publicClient.getBalance({ address: alice.account.address });
    assert.equal(balAfter - balBefore + gas, parseEther("1"));
    assert.equal(await pool.read.netBalance([0n, alice.account.address]), parseEther("1"));
  });

  it("invariant: sum of nets equals contract balance", async () => {
    await tx(pool.write.settle([0n], { account: carol.account, value: parseEther("1") }));
    await tx(pool.write.withdrawCredits([0n], { account: alice.account }));
    const [members, nets] = await pool.read.balanceSheet([0n]);
    assert.equal(members.length, 3);
    const totalNet = nets.reduce((a, b) => a + b, 0n);
    const balance = await publicClient.getBalance({ address: pool.address });
    assert.equal(totalNet, balance);
    assert.equal(totalNet, 0n); // fully settled: everyone at zero, contract empty
  });

  it("deposit pre-funds a member and is withdrawable", async () => {
    await tx(pool.write.createPool(["house"], { account: bob.account }));
    await tx(pool.write.deposit([1n], { account: bob.account, value: parseEther("0.5") }));
    assert.equal(await pool.read.netBalance([1n, bob.account.address]), parseEther("0.5"));
    await tx(pool.write.withdrawCredits([1n], { account: bob.account }));
    assert.equal(await pool.read.netBalance([1n, bob.account.address]), 0n);
  });

  it("rejects non-members and strangers", async () => {
    await assert.rejects(
      pool.write.recordExpense([1n, bob.account.address, [bob.account.address], parseEther("1"), "x"], { account: alice.account }),
      /not a member/
    );
  });
});

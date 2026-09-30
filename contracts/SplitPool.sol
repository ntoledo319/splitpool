// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SplitPool — shared expense pools that settle on-chain (Monad Metropolis entry)
/// @notice Splitwise-style net ledger: a member pays a real-world expense for the group,
///         the contract tracks who owes whom, debtors settle in MON, creditors withdraw.
///         Members can also pre-fund with deposit(). Invariant: sum(net) == contract balance.
contract SplitPool {
    struct Pool {
        string name;
        address creator;
        bool exists;
        uint256 memberCount;
        uint256 totalExpensed;
        uint256 totalSettled;
    }

    uint256 public poolCount;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => address[]) internal _members;
    /// net balance in wei: positive = pool owes member, negative = member owes pool
    mapping(uint256 => mapping(address => int256)) public netBalance;

    event PoolCreated(uint256 indexed poolId, string name, address indexed creator);
    event Joined(uint256 indexed poolId, address indexed member);
    event Deposited(uint256 indexed poolId, address indexed member, uint256 amount);
    event ExpenseRecorded(uint256 indexed poolId, address indexed payer, uint256 amount, string memo);
    event Settled(uint256 indexed poolId, address indexed member, uint256 paid, int256 netAfter);
    event Withdrawn(uint256 indexed poolId, address indexed member, uint256 amount);

    modifier onlyMember(uint256 poolId) {
        require(isMember[poolId][msg.sender], "not a member");
        _;
    }

    modifier poolExists(uint256 poolId) {
        require(pools[poolId].exists, "no such pool");
        _;
    }

    function createPool(string calldata name) external returns (uint256 poolId) {
        poolId = poolCount++;
        Pool storage p = pools[poolId];
        p.name = name;
        p.creator = msg.sender;
        p.exists = true;
        _join(poolId, msg.sender);
        emit PoolCreated(poolId, name, msg.sender);
    }

    function joinPool(uint256 poolId) external poolExists(poolId) {
        _join(poolId, msg.sender);
    }

    function _join(uint256 poolId, address who) internal {
        require(!isMember[poolId][who], "already member");
        isMember[poolId][who] = true;
        _members[poolId].push(who);
        pools[poolId].memberCount++;
        emit Joined(poolId, who);
    }

    /// @notice Pre-fund your balance: money in, net up. Backs future withdrawals.
    function deposit(uint256 poolId) external payable poolExists(poolId) onlyMember(poolId) {
        require(msg.value > 0, "zero deposit");
        netBalance[poolId][msg.sender] += int256(msg.value);
        emit Deposited(poolId, msg.sender, msg.value);
    }

    /// @notice Record an expense that `payer` covered off-chain, split evenly across
    ///         `beneficiaries`. No funds move; nets are updated. The off-chain agent
    ///         (MCP server) calls this after parsing a receipt or chat message.
    function recordExpense(
        uint256 poolId,
        address payer,
        address[] calldata beneficiaries,
        uint256 amount,
        string calldata memo
    ) external poolExists(poolId) onlyMember(poolId) {
        require(amount > 0, "zero amount");
        require(beneficiaries.length > 0, "no beneficiaries");
        require(isMember[poolId][payer], "payer not member");

        uint256 share = amount / beneficiaries.length;
        uint256 remainder = amount - share * beneficiaries.length;

        // payer covered the full amount off-chain: credit them, then debit each
        // beneficiary their share (payer's own share nets out if included)
        netBalance[poolId][payer] += int256(amount);
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address b = beneficiaries[i];
            require(isMember[poolId][b], "beneficiary not member");
            uint256 s = share + (i == 0 ? remainder : 0);
            netBalance[poolId][b] -= int256(s);
        }
        pools[poolId].totalExpensed += amount;
        emit ExpenseRecorded(poolId, payer, amount, memo);
    }

    /// @notice Settle up: pay back what you owe (negative net). Overpayment is refunded.
    function settle(uint256 poolId) external payable poolExists(poolId) onlyMember(poolId) {
        int256 net = netBalance[poolId][msg.sender];
        require(net < 0, "nothing to settle");
        uint256 owed = uint256(-net);
        require(msg.value >= owed, "insufficient settlement");
        netBalance[poolId][msg.sender] += int256(owed);
        pools[poolId].totalSettled += owed;
        if (msg.value > owed) {
            (bool ok, ) = msg.sender.call{value: msg.value - owed}("");
            require(ok, "refund failed");
        }
        emit Settled(poolId, msg.sender, owed, netBalance[poolId][msg.sender]);
    }

    /// @notice Withdraw what the pool owes you, bounded by settled funds on hand.
    function withdrawCredits(uint256 poolId) external poolExists(poolId) onlyMember(poolId) {
        int256 net = netBalance[poolId][msg.sender];
        require(net > 0, "nothing to withdraw");
        uint256 bal = address(this).balance;
        require(bal > 0, "pool not funded yet");
        uint256 payout = uint256(net) < bal ? uint256(net) : bal;
        netBalance[poolId][msg.sender] -= int256(payout);
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "transfer failed");
        emit Withdrawn(poolId, msg.sender, payout);
    }

    function membersOf(uint256 poolId) external view poolExists(poolId) returns (address[] memory) {
        return _members[poolId];
    }

    /// @notice Off-chain helper: full balance sheet for a pool.
    function balanceSheet(uint256 poolId)
        external
        view
        poolExists(poolId)
        returns (address[] memory members, int256[] memory nets)
    {
        members = _members[poolId];
        nets = new int256[](members.length);
        for (uint256 i = 0; i < members.length; i++) {
            nets[i] = netBalance[poolId][members[i]];
        }
    }
}

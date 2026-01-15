// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Extract
/// @notice A game where players try to extract a secret word from an AI agent
/// @dev Secret is stored as keccak256(lowercase(word)), verified on-chain
contract Extract {
    // ============ Constants ============

    uint256 public constant BUY_IN = 0.001 ether;
    uint8 public constant TRIES_PER_BUY_IN = 10;
    uint256 public constant GAME_DURATION = 24 hours;

    // ============ State ============

    struct Game {
        bytes32 commitment;    // keccak256(abi.encodePacked(lowercase(secret)))
        uint256 pot;
        uint256 deadline;
        address winner;
        bool active;
        uint256 gameId;        // Unique ID for this game
    }

    Game public currentGame;

    // Tries are now tracked per game to prevent carry-over exploit
    mapping(address => mapping(uint256 => uint8)) public playerTries;

    address public agent;

    uint256 public totalGamesPlayed;
    uint256 public totalPotsPaid;

    // ============ Events ============

    event GameStarted(uint256 indexed gameId, bytes32 commitment, uint256 deadline);
    event PlayerJoined(address indexed player, uint256 potSize);
    event GuessAttempted(address indexed player, string word, bool correct);
    event GameWon(address indexed winner, uint256 payout);
    event GameRolledOver(uint256 indexed oldGameId, uint256 potCarriedOver);
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);

    // ============ Errors ============

    error OnlyAgent();
    error GameNotActive();
    error GameStillActive();
    error AlreadyWon();
    error NoTriesRemaining();
    error IncorrectBuyIn();
    error NotWinner();
    error NoPot();
    error TransferFailed();

    // ============ Modifiers ============

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    modifier gameActive() {
        if (!currentGame.active) revert GameNotActive();
        if (currentGame.winner != address(0)) revert AlreadyWon();
        if (block.timestamp >= currentGame.deadline) revert GameNotActive();
        _;
    }

    // ============ Constructor ============

    constructor(address _agent) {
        agent = _agent;
    }

    // ============ Agent Functions ============

    /// @notice Start a new game with a secret word commitment
    /// @param commitment keccak256(abi.encodePacked(lowercase(secret)))
    function startGame(bytes32 commitment) external onlyAgent {
        // Can start if no active game, or if deadline passed, or if won
        if (currentGame.active &&
            block.timestamp < currentGame.deadline &&
            currentGame.winner == address(0)) {
            revert GameStillActive();
        }

        uint256 carryOverPot = currentGame.pot;
        totalGamesPlayed++;

        currentGame = Game({
            commitment: commitment,
            pot: carryOverPot,
            deadline: block.timestamp + GAME_DURATION,
            winner: address(0),
            active: true,
            gameId: totalGamesPlayed
        });

        emit GameStarted(totalGamesPlayed, commitment, currentGame.deadline);
    }

    // ============ Player Functions ============

    /// @notice Buy into the current game
    function buyIn() external payable gameActive {
        if (msg.value != BUY_IN) revert IncorrectBuyIn();

        uint256 gameId = currentGame.gameId;
        playerTries[msg.sender][gameId] += TRIES_PER_BUY_IN;
        currentGame.pot += msg.value;

        emit PlayerJoined(msg.sender, currentGame.pot);
    }

    /// @notice Guess the secret word
    /// @param word The guessed word (should be lowercase, trimmed)
    function guess(string calldata word) external gameActive {
        uint256 gameId = currentGame.gameId;
        if (playerTries[msg.sender][gameId] == 0) revert NoTriesRemaining();

        playerTries[msg.sender][gameId]--;

        bytes32 guessHash = keccak256(abi.encodePacked(word));
        bool correct = (guessHash == currentGame.commitment);

        emit GuessAttempted(msg.sender, word, correct);

        if (correct) {
            currentGame.winner = msg.sender;
            currentGame.active = false;
            emit GameWon(msg.sender, currentGame.pot);
        }
    }

    /// @notice Winner claims the pot
    function claimPot() external {
        if (currentGame.winner != msg.sender) revert NotWinner();
        if (currentGame.pot == 0) revert NoPot();

        uint256 payout = currentGame.pot;
        currentGame.pot = 0;
        totalPotsPaid += payout;

        (bool success, ) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Roll over to new game if deadline passed with no winner
    /// @param newCommitment Optional new commitment - if provided, starts new game immediately
    /// @dev Anyone can call with bytes32(0) to just end the game, only agent can provide commitment
    function rollOver(bytes32 newCommitment) external {
        // Must be expired or inactive
        if (currentGame.active &&
            block.timestamp < currentGame.deadline &&
            currentGame.winner == address(0)) {
            revert GameStillActive();
        }

        // Can't roll over if already won (winner should claim)
        if (currentGame.winner != address(0)) {
            revert AlreadyWon();
        }

        uint256 oldGameId = currentGame.gameId;
        uint256 carryOver = currentGame.pot;

        emit GameRolledOver(oldGameId, carryOver);

        // If agent provides new commitment, start new game immediately
        if (newCommitment != bytes32(0)) {
            if (msg.sender != agent) revert OnlyAgent();

            totalGamesPlayed++;
            currentGame = Game({
                commitment: newCommitment,
                pot: carryOver,
                deadline: block.timestamp + GAME_DURATION,
                winner: address(0),
                active: true,
                gameId: totalGamesPlayed
            });

            emit GameStarted(totalGamesPlayed, newCommitment, currentGame.deadline);
        } else {
            // Just mark inactive, keep pot for next startGame()
            currentGame.active = false;
        }
    }

    // ============ View Functions ============

    function getGameInfo() external view returns (
        bytes32 commitment,
        uint256 pot,
        uint256 deadline,
        address winner,
        bool active,
        uint256 timeRemaining
    ) {
        commitment = currentGame.commitment;
        pot = currentGame.pot;
        deadline = currentGame.deadline;
        winner = currentGame.winner;
        active = currentGame.active && winner == address(0) && block.timestamp < deadline;
        timeRemaining = block.timestamp < deadline ? deadline - block.timestamp : 0;
    }

    function getPlayerTries(address player) external view returns (uint8) {
        return playerTries[player][currentGame.gameId];
    }

    function getCurrentGameId() external view returns (uint256) {
        return currentGame.gameId;
    }

    // ============ Admin Functions ============

    /// @notice Update the agent address
    function setAgent(address _agent) external onlyAgent {
        address oldAgent = agent;
        agent = _agent;
        emit AgentUpdated(oldAgent, _agent);
    }
}

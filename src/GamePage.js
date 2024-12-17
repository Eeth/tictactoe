import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { useUser } from './components/UserContext'; // Import the useUser hook
import { io } from 'socket.io-client';
import './GamePage.css'; // Import the CSS file
const address = 'http://127.0.0.1:5000'

const GamePage = () => {
  const { sessionId } = useParams(); // Get sessionId from URL params
  const { user } = useUser(); // Get user from context
  const [gameState, setGameState] = useState([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState(""); // Track whose turn it is
  const [playerX, setPlayerX] = useState(""); // Track player X
  const [playerO, setPlayerO] = useState(""); // Track player O
  const [winner, setWinner] = useState(null);
  const [gameStatus, setGameStatus] = useState("waiting");
  const socketRef = useRef(null); // Ref to store socket instance
  const navigate = useNavigate(); // Hook for navigation

  // Use effect for socket connection and game state updates
  useEffect(() => {
    if (!sessionId) {
      setErrorMessage("Session ID is missing.");
      return;
    }

    const socket = io(address, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to the server');
      socket.emit('join_session', { session_id: sessionId, username: user.username });
      console.log(`Joining session ${sessionId}...`);
    });

    socket.on('game_update', (data) => {
      console.log('game_update received:', data);
      const { game_state, current_player, player_x, player_o, status, winner } = data;

      setGameState(game_state); // Update game state with the new data
      setCurrentPlayer(current_player);
      setPlayerX(player_x);
      setPlayerO(player_o);
      setGameStatus(status);
      setWinner(winner);
    });

    socket.on('error', (data) => {
      console.error('Socket error received:', data);
      setErrorMessage(data.message || "An unknown error occurred.");
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, user.username]);

  // Define the handleMove function
  const handleMove = (row, col) => {
    console.log("handleMove called by:", user.username);

    // If the game hasn't started (only one player), show error message
    if (!playerX || !playerO) {
      setErrorMessage("Waiting for another player to join...");
      return;
    }

    // If the cell is already filled or it's not the player's turn, return early
    if (gameState[row][col] !== "" || (user.username !== (currentPlayer === 'X' ? playerX : playerO))) {
      setErrorMessage("It's not your turn or this cell is already filled.");
      return;
    }

    // Update the local game state immediately on the frontend
    const newGameState = [...gameState];
    newGameState[row][col] = currentPlayer === "X" ? "X" : "O";
    setGameState(newGameState); // Update the state to trigger a re-render

    console.log(`Move made at row: ${row}, col: ${col} by ${user.username}`);

    // Emit the move to the backend using the existing socket connection
    socketRef.current.emit('make_move', {
      session_id: sessionId,
      player: user.username,
      row,
      col,
    });
  };

  // Function to navigate back to the lobby
  const handleBackToLobby = () => {
    navigate('/sessions'); // Replace '/lobby' with your actual lobby route
  };

  return (
    <div className="game-container">
      <h1>Game Session: {sessionId}</h1>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
  
      <p className="turn-info">
        {gameStatus === "waiting" && !winner && "Waiting for another player to join..."}
        {gameStatus === "in-progress" && !winner && `${currentPlayer === "X" ? playerX : playerO}'s turn!`}
      </p>
      <p className="game-result">
        {gameStatus === "completed" && winner === "tie" && "It's a tie!"}
        {gameStatus === "completed" && winner !== "tie" && `${winner} wins!`}
      </p>
  
      <div className="board">
        {gameState.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <button
                key={colIndex}
                className={`cell ${cell}`} 
                onClick={() => handleMove(rowIndex, colIndex)}
                disabled={
                  cell !== "" ||
                  gameStatus === "completed" ||
                  !playerX ||
                  !playerO ||
                  (currentPlayer && user.username !== (currentPlayer === "X" ? playerX : playerO))
                }
              >
                {cell}
              </button>
            ))}
          </div>
        ))}
      </div>
  
      {gameStatus === "completed" && (
        <button className="back-to-lobby" onClick={handleBackToLobby}>
          Back to Sessions
        </button>
      )}
    </div>
  );
  
};

export default GamePage;

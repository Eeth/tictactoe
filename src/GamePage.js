
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from './components/UserContext';
import { io } from 'socket.io-client';
import './GamePage.css';
const address = 'https://eeth1.pythonanywhere.com'
// const address = 'http://localhost:5000';


const GamePage = () => {
  const { sessionId } = useParams();
  const { user } = useUser();
  const [gameState, setGameState] = useState([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [playerX, setPlayerX] = useState("");
  const [playerO, setPlayerO] = useState("");
  const [winner, setWinner] = useState(null);
  const [gameStatus, setGameStatus] = useState("waiting");
  const socketRef = useRef(null);
  const navigate = useNavigate();

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
      socket.emit('join_session', { session_id: sessionId, username: user.username });
    });

    socket.on('game_update', (data) => {
      const { game_state, current_player, player_x, player_o, status, winner } = data;
      setGameState(game_state);
      setCurrentPlayer(current_player);
      setPlayerX(player_x);
      setPlayerO(player_o);
      setGameStatus(status);
      setWinner(winner);
    });

    socket.on('error', (data) => {
      setErrorMessage(data.message || "An unknown error occurred.");
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, user.username]);

  const handleMove = (row, col) => {
    if (!playerX || !playerO) {
      setErrorMessage("Waiting for another player to join...");
      return;
    }

    if (gameState[row][col] !== "" || (user.username !== (currentPlayer === 'X' ? playerX : playerO))) {
      setErrorMessage("It's not your turn or this cell is already filled.");
      return;
    }

    const newGameState = [...gameState];
    newGameState[row][col] = currentPlayer === "X" ? "X" : "O";
    setGameState(newGameState);

    socketRef.current.emit('make_move', {
      session_id: sessionId,
      player: user.username,
      row,
      col,
    });
  };

  const handleBackToLobby = () => {
    navigate('/sessions');
  };

  return (
    <div className="game-container">
      <h1 className="game-title">Game Session: {sessionId}</h1>
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="game-info">
        {gameStatus === "waiting" && !winner && <p>Waiting for another player to join...</p>}
        {gameStatus === "in-progress" && !winner && <p>{currentPlayer === "X" ? playerX : playerO}'s turn!</p>}
        {gameStatus === "completed" && winner === "tie" && <p>It's a tie!</p>}
        {gameStatus === "completed" && winner !== "tie" && <p>{winner} wins!</p>}
      </div>

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


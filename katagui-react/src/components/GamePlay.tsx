import React, { useState, useCallback, useRef, useEffect } from 'react';
import GoBoard from './GoBoard';
import { useGameStore } from '../store/gameStore';
import { useKataGo } from '../hooks/useKataGo';
import { api } from '../services/api';
import type { Point, Move, KataGoMove } from '../types/game';
import { pointToSGF, sgfToPoint } from '../services/coordinateUtils';
import { moves2sgf, downloadSgf, sgf2list, readFileAsText } from '../services/sgf';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackwardStep, faBackward, faChevronLeft, faChevronRight, faForward, faForwardStep, faRotateLeft, faArrowRight, faRobot, faStar, faChartBar, faFolderOpen, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

const GamePlay: React.FC = () => {
  const {
    boardSize,
    handicap,
    komi,
    moves,
    currentPosition,
    nextPlayer,
    boardState,
    settings,
    error: storeError,
    newGame,
    addMove,
    goToStart,
    goToEnd,
    goToMove,
    nextMove: goToNextMove,
    previousMove: goToPreviousMove,
    removeLastMove,
    getMoveList,
    getCurrentMove,
    canPlayAt,
    setGameHash,
    setError,
    updateSettings,
  } = useGameStore();

  const { getMove, getScore, error: kataError } = useKataGo();

  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [selectedHandicap, setSelectedHandicap] = useState(0);
  const [selectedKomi, setSelectedKomi] = useState(7.5);
  const [bestMoves, setBestMoves] = useState<KataGoMove[]>([]);
  const [scoreInfo, setScoreInfo] = useState<{ score: number; winprob: number } | null>(null);
  const [isWaitingForBot, setIsWaitingForBot] = useState(false);
  const [showBestMovesOnBoard, setShowBestMovesOnBoard] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // File input ref for loading SGF
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request bot move
  const requestBotMove = useCallback(async () => {
    if (isWaitingForBot) return;

    setIsWaitingForBot(true);
    setShowBestMovesOnBoard(false); // Clear best move marks
    const moveList = getMoveList();

    const response = await getMove(boardSize, moveList, komi, handicap);

    if (response) {
      const botMove: Move = {
        mv: response.bot_move,
        p: response.diagnostics.winprob,
        score: response.diagnostics.score,
        agent: 'bot',
        data: response.diagnostics,
      };

      addMove(botMove);
      setBestMoves(response.diagnostics.best_ten);
      setScoreInfo({
        score: response.diagnostics.score,
        winprob: response.diagnostics.winprob,
      });
    }

    setIsWaitingForBot(false);
  }, [isWaitingForBot, getMoveList, boardSize, komi, handicap, getMove, addMove]);

  // Handle user click on board
  const handleIntersectionClick = useCallback(
    async (point: Point) => {
      if (isWaitingForBot || currentPosition !== moves.length) {
        // Can't play if we're not at the end of the game or waiting for bot
        return;
      }

      if (!canPlayAt(point)) {
        return;
      }

      const sgfMove = pointToSGF(point, boardSize);
      const humanMove: Move = {
        mv: sgfMove,
        agent: 'human',
      };

      addMove(humanMove);

      // Hide best moves after user makes a move
      setShowBestMovesOnBoard(false);

      // Request bot response
      if (!settings.disable_ai) {
        setTimeout(() => requestBotMove(), 100);
      }
    },
    [isWaitingForBot, currentPosition, moves.length, canPlayAt, boardSize, addMove, settings.disable_ai, requestBotMove]
  );

  // Create new game
  const handleNewGame = useCallback(async () => {
    try {
      const response = await api.createGame({
        handicap: selectedHandicap,
        komi: selectedKomi,
      });

      setGameHash(response.game_hash);
      newGame(selectedHandicap, selectedKomi, boardSize);
      setShowNewGameDialog(false);

      // If handicap game, white (bot) plays first
      if (selectedHandicap >= 2 && !settings.disable_ai) {
        setTimeout(() => requestBotMove(), 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  }, [selectedHandicap, selectedKomi, boardSize, setGameHash, newGame, settings.disable_ai, requestBotMove, setError]);

  // Pass move
  const handlePass = useCallback(() => {
    const passMove: Move = {
      mv: 'pass',
      agent: 'human',
    };
    addMove(passMove);

    if (!settings.disable_ai) {
      setTimeout(() => requestBotMove(), 100);
    }
  }, [addMove, settings.disable_ai, requestBotMove]);

  // Get current score
  const handleGetScore = useCallback(async () => {
    const moveList = getMoveList();
    const response = await getScore(boardSize, moveList);

    if (response) {
      setScoreInfo({
        score: response.score,
        winprob: response.winprob,
      });
    }
  }, [getMoveList, boardSize, getScore]);

  // Fetch best moves for current position
  const fetchBestMoves = useCallback(async () => {
    const moveList = getMoveList();
    const response = await getMove(boardSize, moveList, komi, handicap);

    if (response) {
      setBestMoves(response.diagnostics.best_ten);
      setScoreInfo({
        score: response.diagnostics.score,
        winprob: response.diagnostics.winprob,
      });
    }
  }, [getMoveList, boardSize, komi, handicap, getMove]);

  // Handle Best button click
  const handleToggleBestMoves = useCallback(async () => {
    const newValue = !showBestMovesOnBoard;
    setShowBestMovesOnBoard(newValue);

    // Fetch best moves when turning on
    if (newValue) {
      await fetchBestMoves();
    }
  }, [showBestMovesOnBoard, fetchBestMoves]);

  // Save game as SGF
  const handleSaveSgf = useCallback(() => {
    if (moves.length === 0) {
      setError('No moves to save');
      return;
    }

    const metadata = {
      pb: 'Black',
      pw: 'White',
      km: komi.toString(),
      dt: new Date().toISOString().slice(0, 10),
    };

    const sgf = moves2sgf(moves, metadata);
    const filename = `game-${new Date().getTime()}.sgf`;
    downloadSgf(filename, sgf);
  }, [moves, komi, setError]);

  // Load SGF file
  const handleLoadSgf = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const sgfText = await readFileAsText(file);
      const parsed = sgf2list(sgfText);

      // Start a new game with the loaded komi
      newGame(0, parsed.komi, boardSize);

      // Add all moves from the SGF
      for (let i = 0; i < parsed.moves.length; i++) {
        const mv = parsed.moves[i];
        const prob = parseFloat(parsed.probs[i]) || 0;
        const score = parseFloat(parsed.scores[i]) || 0;

        const move: Move = {
          mv,
          p: prob / 100, // Convert from percentage to 0-1
          score,
          agent: '',
        };

        addMove(move);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SGF file');
    }
  }, [boardSize, newGame, addMove, setError]);

  // Toggle bot mode
  const handleToggleBotMode = useCallback(() => {
    updateSettings({ disable_ai: !settings.disable_ai });
  }, [settings.disable_ai, updateSettings]);

  // Show emoji based on win probability change
  const getMoveEmoji = (move: Move | null): string => {
    if (!move || !move.data) return '';

    const winprob = move.data.winprob;
    if (winprob > 0.65) return '😊';
    if (winprob > 0.55) return '🙂';
    if (winprob > 0.45) return '😐';
    if (winprob > 0.35) return '😟';
    return '😞';
  };

  const currentMove = getCurrentMove();

  // Mark the last move with a circle
  const lastMoveMark = React.useMemo(() => {
    if (moves.length === 0 || currentPosition === 0) return null;

    const lastMove = moves[currentPosition - 1];
    if (!lastMove || lastMove.mv === 'pass' || lastMove.mv === 'resign') return null;

    const point = sgfToPoint(lastMove.mv, boardSize);
    if (!point) return null;

    return {
      coord: point,
      type: 'circle' as const,
    };
  }, [moves, currentPosition, boardSize]);

  // Convert best moves to board marks (A-J letters)
  const bestMoveMarks = React.useMemo(() => {
    if (!showBestMovesOnBoard || !bestMoves.length) return [];

    // Filter to only show high-probability moves (psv >= 5%)
    const highProbMoves = bestMoves.filter(move => move.psv >= 5.0);

    const letters = 'ABCDEFGHIJ';
    return highProbMoves.slice(0, 10).map((move, idx) => {
      const point = sgfToPoint(move.move, boardSize);
      if (!point) return null;

      return {
        coord: point,
        type: 'letter' as const,
        value: letters[idx],
      };
    }).filter((mark): mark is import('../types/game').BoardMark => mark !== null);
  }, [showBestMovesOnBoard, bestMoves, boardSize]);

  // Combine all marks
  const allMarks = React.useMemo(() => {
    const marks = [...bestMoveMarks];
    if (lastMoveMark) marks.push(lastMoveMark);
    return marks;
  }, [bestMoveMarks, lastMoveMark]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          if (e.ctrlKey) {
            goToMove(currentPosition - 10);
          } else {
            goToPreviousMove();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey) {
            goToMove(currentPosition + 10);
          } else {
            goToNextMove();
          }
          break;
        case 'Home':
          e.preventDefault();
          goToStart();
          break;
        case 'End':
          e.preventDefault();
          goToEnd();
          break;
        case 'Enter':
          e.preventDefault();
          if (!isWaitingForBot && currentPosition === moves.length && !settings.disable_ai) {
            requestBotMove();
          }
          break;
        case 'u':
        case 'U':
          e.preventDefault();
          removeLastMove();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          handlePass();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          handleGetScore();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          handleToggleBestMoves();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousMove, goToNextMove, goToStart, goToEnd,
    goToMove, goToMove, requestBotMove, removeLastMove, handlePass, handleGetScore, handleToggleBestMoves, isWaitingForBot, currentPosition, moves.length, settings.disable_ai]);

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      {/* <h1>DeepGo - Play Against KataGo</h1> */}


      {/* Centered wrapper for top controls and board */}
      <div style={{ margin: '0 auto', width: 'fit-content' }}>
      {/* New Game button and Bot Mode toggle */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button onClick={() => setShowNewGameDialog(true)} style={{ padding: '8px 16px' }}>
          New Game
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Bot Mode:</span>
          <div
            onClick={handleToggleBotMode}
            style={{
              position: 'relative',
              width: '44px',
              height: '24px',
              backgroundColor: !settings.disable_ai ? '#4CAF50' : '#ccc',
              borderRadius: '12px',
              transition: 'background-color 0.3s',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: !settings.disable_ai ? '22px' : '2px',
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        </label>
      </div>


      {/* Health indicator - shows red dot when there's an error */}
      {(storeError || kataError) && (
        <>
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              width: '12px',
              height: '12px',
              backgroundColor: '#dc3545',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 0 8px rgba(220, 53, 69, 0.6)',
            }}
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            title={storeError || kataError || ''}
          />
          {showErrorDetails && (
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                right: '20px',
                backgroundColor: 'white',
                border: '2px solid #dc3545',
                borderRadius: '4px',
                padding: '12px',
                maxWidth: '300px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                zIndex: 1000,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ color: '#dc3545', fontSize: '14px' }}>Error</strong>
                <button
                  onClick={() => setShowErrorDetails(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0',
                    lineHeight: 1,
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: '13px', color: '#333' }}>{storeError || kataError}</div>
            </div>
          )}
        </>
      )}

      {/* Main board */}
      <div>
        <div style={{ flexShrink: 0 }}>
          <GoBoard
            size={boardSize}
            stones={boardState}
            marks={allMarks}
            onIntersectionClick={handleIntersectionClick}
            showHover={currentPosition === moves.length && !isWaitingForBot}
            nextPlayer={nextPlayer}
            width={480}
            height={480}
          />

          {/* Game info - moved below board */}
          {/* <div style={{ marginTop: '20px' }}>
            <div>
              <strong>Handicap:</strong> {handicap} | <strong>Komi:</strong> {komi} | <strong>Move:</strong>{' '}
              {currentPosition} / {moves.length}
              {isWaitingForBot && ' (Bot thinking...)'}
            </div>
            {scoreInfo && (
              <div>
                <strong>Score:</strong> {scoreInfo.score > 0 ? `B+${scoreInfo.score.toFixed(1)}` : `W+${Math.abs(scoreInfo.score).toFixed(1)}`} |{' '}
                <strong>Win Probability:</strong> {scoreInfo.winprob.toFixed(1)}%
              </div>
            )}
            {settings.show_emoji && currentMove && (
              <div style={{ fontSize: '48px' }}>{getMoveEmoji(currentMove)}</div>
            )}
          </div> */}

      {/* Game controls - below board */}
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '480px', gap: '16px' }}>

        {/* AI Group */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
          <button onClick={requestBotMove} title="AI Play (Enter)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faRobot} size="lg" />
          </button>
          <button
            onClick={handleToggleBestMoves}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showBestMovesOnBoard ? '#4CAF50' : 'black',
            }}
            title="Best Moves (B)"
          >
            <FontAwesomeIcon icon={faStar} size="lg" />
          </button>
          <button onClick={handleGetScore} title="Score (S)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faChartBar} size="lg" />
          </button>
        </div>

        {/* Navigation Group */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
          <button onClick={goToStart} disabled={currentPosition === 0} title="First Move (Home)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition === 0 ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faBackwardStep} size="lg" />
          </button>
          <button onClick={() => goToMove(currentPosition - 10)} disabled={currentPosition === 0} title="Back 10 (Ctrl+←)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition === 0 ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faBackward} size="lg" />
          </button>
          <button onClick={goToPreviousMove} disabled={currentPosition === 0} title="Previous Move (← or Backspace)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition === 0 ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faChevronLeft} size="lg" />
          </button>
          <button onClick={goToNextMove} disabled={currentPosition === moves.length} title="Next Move (→)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition === moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition === moves.length ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faChevronRight} size="lg" />
          </button>
          <button onClick={() => goToMove(currentPosition + 10)} disabled={currentPosition === moves.length} title="Next 10 (Ctrl+→)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition === moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition === moves.length ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faForward} size="lg" />
          </button>
          <button onClick={goToEnd} disabled={currentPosition === moves.length} title="Last Move (End)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition === moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition === moves.length ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faForwardStep} size="lg" />
          </button>
          <button onClick={removeLastMove} disabled={moves.length === 0 || currentPosition !== moves.length} title="Undo (U)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: (moves.length === 0 || currentPosition !== moves.length) ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (moves.length === 0 || currentPosition !== moves.length) ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faRotateLeft} size="lg" />
          </button>
          <button onClick={handlePass} disabled={currentPosition !== moves.length} title="Pass (P)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: currentPosition !== moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPosition !== moves.length ? 0.5 : 1 }}>
            <FontAwesomeIcon icon={faArrowRight} size="lg" />
          </button>
        </div>

        {/* File Group */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
          <button onClick={() => fileInputRef.current?.click()} title="Load SGF" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faFolderOpen} size="lg" />
          </button>
          <button onClick={handleSaveSgf} title="Save SGF" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faFloppyDisk} size="lg" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sgf"
          style={{ display: 'none' }}
          onChange={handleLoadSgf}
        />
      </div>
        </div>

        {/* Side panel */}
        {/* <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Best Moves</h3>
          {settings.show_best_ten && bestMoves.length > 0 && (
            <div>
              <ol>
                {bestMoves.slice(0, 10).map((move, idx) => (
                  <li key={idx}>
                    <strong>{move.move}</strong> - {move.psv.toFixed(1)}%
                  </li>
                ))}
              </ol>
            </div>
          )}

        </div> */}
      </div>
      </div>

      {/* New game dialog */}
      {showNewGameDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', minWidth: '400px' }}>
            <h2>New Game</h2>

            <div style={{ marginBottom: '20px' }}>
              <label>
                <strong>Handicap:</strong>
                <select
                  value={selectedHandicap}
                  onChange={(e) => setSelectedHandicap(Number(e.target.value))}
                  style={{ marginLeft: '10px', padding: '5px' }}
                >
                  {[0, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => (
                    <option key={h} value={h}>
                      {h === 0 ? 'Even game' : `${h} stones`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>
                <strong>Komi:</strong>
                <select
                  value={selectedKomi}
                  onChange={(e) => setSelectedKomi(Number(e.target.value))}
                  style={{ marginLeft: '10px', padding: '5px' }}
                >
                  <option value={0.5}>0.5</option>
                  <option value={5.5}>5.5</option>
                  <option value={6.5}>6.5</option>
                  <option value={7.5}>7.5</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewGameDialog(false)}>Cancel</button>
              <button onClick={handleNewGame}>Start Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePlay;

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import GoBoard from './GoBoard';
import { gameStore } from '../store/gameStoreMobx';
import { useKataGo } from '../hooks/useKataGo';
import { api } from '../services/api';
import type { Point, Move, KataGoMove, BoardMark } from '../types/game';
import { pointToSGF, sgfToPoint } from '../services/coordinateUtils';
import { moves2sgf, downloadSgf, sgf2list, readFileAsText } from '../services/sgf';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackwardStep, faBackward, faChevronLeft, faChevronRight, faForward, faForwardStep, faRotateLeft, faArrowRight, faRobot, faStar, faChartBar, faFolderOpen, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

const GamePlay: React.FC = () => {
  // MobX store - no destructuring needed, direct access
  const store = gameStore;

  const { getMove, getScore, error: kataError } = useKataGo();

  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [selectedHandicap, setSelectedHandicap] = useState(0);
  const [selectedKomi, setSelectedKomi] = useState(7.5);
  const [bestMoves, setBestMoves] = useState<KataGoMove[]>([]);
  const [isWaitingForBot, setIsWaitingForBot] = useState(false);
  const [showBestMovesOnBoard, setShowBestMovesOnBoard] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [isSelfPlaying, setIsSelfPlaying] = useState(false);

  // File input ref for loading SGF
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request bot move
  const requestBotMove = useCallback(async () => {
    console.log('requestBotMove called');
    if (isWaitingForBot) {
      console.log('requestBotMove returned early: isWaitingForBot is true');
      return;
    }

    setIsWaitingForBot(true);
    setShowBestMovesOnBoard(false); // Clear best move marks
    const moveList = store.getMoveList();

    const response = await getMove(store.boardSize, moveList, store.komi, store.handicap);

    if (response) {
      const botMove: Move = {
        mv: response.bot_move,
        p: response.diagnostics.winprob,
        score: response.diagnostics.score,
        agent: 'bot',
        data: response.diagnostics,
      };

      store.addMove(botMove);
      setBestMoves(response.diagnostics.best_ten);
    }

    setIsWaitingForBot(false);
  }, [isWaitingForBot, getMove, store]);

  // Handle user click on board
  const handleIntersectionClick = useCallback(
    async (point: Point) => {
      if (isWaitingForBot) {
        // Can't play if we're waiting for bot
        return;
      }

      if (!store.canPlayAt(point)) {
        return;
      }

      const sgfMove = pointToSGF(point, store.boardSize);
      const humanMove: Move = {
        mv: sgfMove,
        agent: 'human',
      };

      store.addMove(humanMove);

      // Hide best moves after user makes a move
      setShowBestMovesOnBoard(false);
      setBestMoves([]);

      // Request bot response
      if (!store.settings.disable_ai) {
        setTimeout(() => requestBotMove(), 100);
      }
    },
    [isWaitingForBot, store, requestBotMove]
  );

  // Create new game
  const handleNewGame = useCallback(async () => {
    try {
      const response = await api.createGame({
        handicap: selectedHandicap,
        komi: selectedKomi,
      });

      store.setGameHash(response.game_hash);
      store.newGame(selectedHandicap, selectedKomi, store.boardSize);
      setShowNewGameDialog(false);
      setIsSelfPlaying(false);

      // If handicap game, white (bot) plays first
      if (selectedHandicap >= 2 && !store.settings.disable_ai) {
        setTimeout(() => requestBotMove(), 500);
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  }, [selectedHandicap, selectedKomi, store, requestBotMove]);

  // Pass move
  const handlePass = useCallback(() => {
    const passMove: Move = {
      mv: 'pass',
      agent: 'human',
    };
    store.addMove(passMove);

    if (!store.settings.disable_ai) {
      setTimeout(() => requestBotMove(), 100);
    }
  }, [store, requestBotMove]);

  // Get current score
  const handleGetScore = useCallback(async () => {
    const moveList = store.getMoveList();
    await getScore(store.boardSize, moveList);
  }, [store, getScore]);

  // Fetch best moves for current position
  const fetchBestMoves = useCallback(async () => {
    const moveList = store.getMoveList();
    const response = await getMove(store.boardSize, moveList, store.komi, store.handicap);

    if (response) {
      setBestMoves(response.diagnostics.best_ten);
    }
  }, [store, getMove]);

  // Handle Best button click
  const handleToggleBestMoves = useCallback(async () => {
    const newValue = !showBestMovesOnBoard;
    setShowBestMovesOnBoard(newValue);

    if (newValue) {
      setBestMoves([]); // Clear stale data immediately
      await fetchBestMoves();
    } else {
      setBestMoves([]); // Also clear when turning off
    }
  }, [showBestMovesOnBoard, fetchBestMoves]);

  // Save game as SGF
  const handleSaveSgf = useCallback(() => {
    if (store.moves.length === 0) {
      store.setError('No moves to save');
      return;
    }

    const metadata = {
      pb: 'Black',
      pw: 'White',
      km: store.komi.toString(),
      dt: new Date().toISOString().slice(0, 10),
    };

    const sgf = moves2sgf(store.moves, metadata);
    const filename = `game-${new Date().getTime()}.sgf`;
    downloadSgf(filename, sgf);
  }, [store]);

  // Load SGF file
  const handleLoadSgf = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const sgfText = await readFileAsText(file);
      const parsed = sgf2list(sgfText);

      // Start a new game with the loaded komi
      store.newGame(0, parsed.komi, store.boardSize);

      // Add all moves from the SGF
      for (let i = 0; i < parsed.moves.length; i++) {
        const mv = parsed.moves[i];
        const prob = parseFloat(parsed.probs[i]) || 0;
        const score = parseFloat(parsed.scores[i]) || 0;

              const move: Move = {
                mv,
                p: prob / 100, // Convert from percentage to 0-1
                score,
                agent: 'human',
              };
        store.addMove(move);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      store.setError(null);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to load SGF file');
    }
  }, [store]);

  const handleToggleBotMode = useCallback(() => {
    store.updateSettings({ disable_ai: !store.settings.disable_ai });
  }, [store]);

  // Self-play loop
  useEffect(() => {
    console.log('Self-play effect triggered', { isSelfPlaying, isWaitingForBot, disable_ai: store.settings.disable_ai });
    if (isSelfPlaying && !isWaitingForBot && !store.settings.disable_ai) {
      // Stop if game is over (two consecutive passes)
      if (
        store.moves.length > 1 &&
        store.moves[store.moves.length - 1].mv === 'pass' &&
        store.moves[store.moves.length - 2].mv === 'pass'
      ) {
        console.log('Self-play stopped: Two consecutive passes.');
        setIsSelfPlaying(false);
        return;
      }

      console.log('Requesting bot move for self-play...');
      // Add a small delay to make it easier to follow
      const timeoutId = setTimeout(() => {
        requestBotMove();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [isSelfPlaying, store.moves, isWaitingForBot, store.settings.disable_ai, requestBotMove]);

  // Convert best moves to board marks (A-J letters)
  const getBestMoveMarks = (): BoardMark[] => {
    if (!showBestMovesOnBoard || !bestMoves.length) return [];

    let movesToShow: KataGoMove[] = [];
    if (store.settings.show_best_ten) {
      movesToShow = bestMoves;
    } else {
      const mmax = bestMoves[0]?.psv || 0;
      if (mmax > 0) {
        movesToShow = bestMoves.filter(move => move.psv >= 0.05 * mmax);
      }
    }

    const letters = 'ABCDEFGHIJ';
    return movesToShow.slice(0, 10).map((move, idx): BoardMark | null => {
      const point = sgfToPoint(move.move, store.boardSize);
      if (!point) return null;

      return {
        coord: point,
        type: 'letter' as const,
        value: letters[idx],
      };
    }).filter((mark): mark is BoardMark => mark !== null);
  };

  // Combine all marks
  const getAllMarks = (): BoardMark[] => {
    const marks: BoardMark[] = [...getBestMoveMarks()];
    if (store.lastMoveMark) marks.push(store.lastMoveMark);
    return marks;
  };

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
            store.goToMove(store.currentPosition - 10);
          } else {
            store.previousMove();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey) {
            store.goToMove(store.currentPosition + 10);
          } else {
            store.nextMove();
          }
          break;
        case 'Home':
          e.preventDefault();
          store.goToStart();
          break;
        case 'End':
          e.preventDefault();
          store.goToEnd();
          break;
        case 'Enter':
          e.preventDefault();
          if (!isWaitingForBot && store.currentPosition === store.moves.length && !store.settings.disable_ai) {
            requestBotMove();
          }
          break;
        case 'u':
        case 'U':
          e.preventDefault();
          store.removeLastMove();
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
  }, [store, requestBotMove, handlePass, handleGetScore, handleToggleBestMoves, isWaitingForBot]);

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
        <button onClick={() => {
          console.log('Self-Play button clicked');
          setIsSelfPlaying(!isSelfPlaying);
        }} style={{ padding: '8px 16px' }}>
          {isSelfPlaying ? 'Stop' : 'Self-Play'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Bot Mode:</span>
          <div
            onClick={handleToggleBotMode}
            style={{
              position: 'relative',
              width: '44px',
              height: '24px',
              backgroundColor: !store.settings.disable_ai ? '#4CAF50' : '#ccc',
              borderRadius: '12px',
              transition: 'background-color 0.3s',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: !store.settings.disable_ai ? '22px' : '2px',
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
      {(store.error || kataError) && (
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
            title={store.error || kataError || ''}
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
              <div style={{ fontSize: '13px', color: '#333' }}>{store.error || kataError}</div>
            </div>
          )}
        </>
      )}

      {/* Main board */}
      <div>
        <div style={{ flexShrink: 0 }}>
          <GoBoard
            size={store.boardSize}
            stones={store.boardState}
            marks={getAllMarks()}
            onIntersectionClick={handleIntersectionClick}
            showHover={store.currentPosition === store.moves.length && !isWaitingForBot}
            nextPlayer={store.nextPlayer}
            width={480}
            height={480}
          />

          {/* Game info - moved below board */}
          {/* <div style={{ marginTop: '20px' }}>
            <div>
              <strong>Handicap:</strong> {store.handicap} | <strong>Komi:</strong> {store.komi} | <strong>Move:</strong>{' '}
              {store.currentPosition} / {store.moves.length}
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
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F5E8C7', borderRadius: '8px', padding: '3px' }}>
          <button onClick={requestBotMove} title="AI Play (Enter)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333333' }}>
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
              color: showBestMovesOnBoard ? '#4CAF50' : '#333333',
            }}
            title="Best Moves (B)"
          >
            <FontAwesomeIcon icon={faStar} size="lg" />
          </button>
          <button onClick={handleGetScore} title="Score (S)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333333' }}>
            <FontAwesomeIcon icon={faChartBar} size="lg" />
          </button>
        </div>

        {/* Navigation Group */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F5E8C7', borderRadius: '8px', padding: '3px' }}>
          <button onClick={store.goToStart} disabled={store.currentPosition === 0} title="First Move (Home)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition === 0 ? 'not-allowed' : 'pointer', borderRadius: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition === 0 ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faBackwardStep} size="lg" />
          </button>
          <button onClick={() => store.goToMove(store.currentPosition - 10)} disabled={store.currentPosition === 0} title="Back 10 (Ctrl+←)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition === 0 ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faBackward} size="lg" />
          </button>
          <button onClick={store.previousMove} disabled={store.currentPosition === 0} title="Previous Move (← or Backspace)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition === 0 ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faChevronLeft} size="lg" />
          </button>
          <button onClick={store.nextMove} disabled={store.currentPosition === store.moves.length} title="Next Move (→)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition === store.moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition === store.moves.length ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faChevronRight} size="lg" />
          </button>
          <button onClick={() => store.goToMove(store.currentPosition + 10)} disabled={store.currentPosition === store.moves.length} title="Next 10 (Ctrl+→)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition === store.moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition === store.moves.length ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faForward} size="lg" />
          </button>
          <button onClick={store.goToEnd} disabled={store.currentPosition === store.moves.length} title="Last Move (End)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition === store.moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition === store.moves.length ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faForwardStep} size="lg" />
          </button>
          <button onClick={store.removeLastMove} disabled={store.moves.length === 0 || store.currentPosition !== store.moves.length} title="Undo (U)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: (store.moves.length === 0 || store.currentPosition !== store.moves.length) ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (store.moves.length === 0 || store.currentPosition !== store.moves.length) ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faRotateLeft} size="lg" />
          </button>
          <button onClick={handlePass} disabled={store.currentPosition !== store.moves.length} title="Pass (P)" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: store.currentPosition !== store.moves.length ? 'not-allowed' : 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: store.currentPosition !== store.moves.length ? '#BBB199' : '#333333' }}>
            <FontAwesomeIcon icon={faArrowRight} size="lg" />
          </button>
        </div>

        {/* File Group */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F5E8C7', borderRadius: '8px', padding: '3px' }}>
          <button onClick={() => fileInputRef.current?.click()} title="Load SGF" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333333' }}>
            <FontAwesomeIcon icon={faFolderOpen} size="lg" />
          </button>
          <button onClick={handleSaveSgf} title="Save SGF" style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333333' }}>
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

export default observer(GamePlay);

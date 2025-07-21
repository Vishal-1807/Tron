import { Application } from 'pixi.js'
import { hideSplash, loadAssets } from './loader';
import { createBackground, createBottombar, createTitle, createToolbar,
        createStartButton, createMines, createHome, createBalanceTab,
        createBetTab, createGridTab } from './components';
        // createBottomTextDisplay
import { GlobalState } from './globals/gameState';
import { WebSocketService } from './WebSockets/WebSocketService';
import { getUIVisibilityManager, registerUIElement } from './utils/uiVisibilityManager';
import { initializeActivityManager, pauseActivityTimer, resumeActivityTimer } from './utils/gameActivityManager';

// 👇 Attach startPixiGame to window for React to call
(window as any).startPixiGame = async (container: HTMLDivElement) => {
    // Get token from session storage instead of bridge
    const token = sessionStorage.getItem('token') || "";
    if (token) {
        console.log("Token retrieved from session storage:", token);
        GlobalState.setToken(token);
    } else {
        console.warn("No token found in session storage");
    }

    const splash = document.createElement('div');
    splash.id = 'splash';
    splash.style.position = 'absolute';
    splash.style.top = '0';
    splash.style.left = '0';
    splash.style.right = '0';
    splash.style.bottom = '0';
    splash.style.background = 'black';
    splash.style.zIndex = '10';
    splash.style.display = 'flex';
    splash.style.alignItems = 'center';
    splash.style.justifyContent = 'center';
    splash.style.pointerEvents = 'none';

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';

    const source = document.createElement('source');
    source.src = 'https://s3.eu-west-2.amazonaws.com/static.inferixai.link/pixi-game-assets/tron-minesweeper/assets/minesweeper_splash.mp4';
    source.type = 'video/mp4';

    video.appendChild(source);
    splash.appendChild(video);
    container.appendChild(splash);

    const app = new Application();
    await app.init({
        background: '#080f16',
        autoStart: true,
        width: container.clientWidth,
        height: container.clientHeight,
        resolution: window.devicePixelRatio || 1,
        antialias: true,
    });

    // Set canvas styles to ensure it covers the entire container with no gaps
    app.canvas.style.position = 'absolute';
    app.canvas.style.top = '0';
    app.canvas.style.left = '0';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    app.canvas.style.zIndex = '1';
    app.canvas.style.overflow = 'hidden';
    app.canvas.style.display = 'block';

    // Set container styles to ensure proper rendering with no gaps
    container.style.overflow = 'hidden';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.display = 'block';
    container.style.position = 'relative';

    container.appendChild(app.canvas);

    // Initialize UI Visibility Manager
    const uiVisibilityManager = getUIVisibilityManager({
        animationDuration: 300,
        debugMode: true,
        fadeEffect: true
    });

    await loadAssets();
    const ws = await WebSocketService.getInstance();

    // Setting up inactivity manager
    const initActivityManager = () => {
    // Initialize the activity manager with 2-minute timeout
    const activityManager = initializeActivityManager({
        timeoutMinutes: 2,
        debugMode: false, // Set to false in production
        excludeFromTimer: [
        // Add any activity types you want to exclude from timer reset
        // 'some_activity_type'
        ]
    });

    console.log('🕐 Activity manager initialized with 2-minute timeout');

    return activityManager;
    };

    const activityManager = initActivityManager();

    setTimeout(() => {
    resumeActivityTimer();
    console.log('🕐 Activity timer started after initialization');
    }, 1000);

    // Create components once (but not start button yet)
    const background = createBackground(app.screen.width, app.screen.height);
    app.stage.addChild(background);

    const home = createHome(app.screen.width, app.screen.height);
    app.stage.addChild(home);

    const balanceTab = createBalanceTab(app.screen.width, app.screen.height);
    app.stage.addChild(balanceTab);

    const title = createTitle(app.screen.width, app.screen.height);
    app.stage.addChild(title);

    // Create bottom text display for game status messages
    // const bottomTextDisplay = createBottomTextDisplay({
    //   width: app.screen.width,
    //   height: app.screen.height,
    //   fontFamily: 'GameFont',
    //   fontSize: 24,
    //   fontColor: '0x7DE8EB',
    //   animationDuration: 300,
    //   fadeEffect: true
    // });
    // app.stage.addChild(bottomTextDisplay);

    // Create bottombar (background only)
    const bottombar = createBottombar(app.screen.width, app.screen.height);
    app.stage.addChild(bottombar);

    // Create bet tab
    const betTab = createBetTab(app.screen.width, app.screen.height);
    app.stage.addChild(betTab);

    // Register specific bet tab buttons for hiding during gameplay
    if (betTab.children[0]) {
        registerUIElement(betTab.children[0], 'betMinusButton');
    }
    if (betTab.children[2]) {
        registerUIElement(betTab.children[2], 'betPlusButton');
    }

    // Create grid tab
    const gridTab = createGridTab(app.screen.width, app.screen.height, app.stage);
    app.stage.addChild(gridTab);

    // Create toolbar
    const toolbar = createToolbar(app.screen.width, app.screen.height, app);
    app.stage.addChild(toolbar);

    // Create mines container
    const mines = createMines(app.screen.width, app.screen.height, GlobalState.total_rows, GlobalState.total_cols, undefined); // bottomTextDisplay
    app.stage.addChild(mines);

    // Initially disable the mines container before game start
    if (mines && (mines as any).disableContainer) {
        (mines as any).disableContainer();
        console.log('🔒 Mines container initially disabled - waiting for game start');
    }

    // Set the bottom text display reference in the mines container
    // if (mines && (mines as any).setBottomTextDisplay) {
    //   (mines as any).setBottomTextDisplay(bottomTextDisplay);
    // }

    // Variable to hold start button reference
    let startButton = null;

    // STEP 1: Get balance first
    console.log('📡 STEP 1: Requesting balance...');
    const getBalance = (): Promise<void> => {
        return new Promise((resolve) => {
        ws.on('getbalance', (res) => {
            if (res?.balance !== undefined) {
            GlobalState.setBalance(res.balance);
            console.log('💰 Balance retrieved:', res.balance);
            resolve();
            }
        });
        ws.send('getbalance', { operation: 'getbalance' });
        });
    };

    // STEP 2: Check pending games
    const checkAndHandlePendingGames = async (): Promise<boolean> => {
        console.log('🔍 STEP 2: Checking pending games...');
        return await checkPendingGames(removeSplashScreen);
    };

    const createStartButtonStep = (): void => {
        console.log('🎮 STEP 3: Creating start button...');
        startButton = createStartButton(app.screen.width, app.screen.height, mines);
        app.stage.addChild(startButton);

        // Set the start button reference in the mines container
        if (mines && (mines as any).setStartButton) {
        (mines as any).setStartButton(startButton);
        }

        // Set UI component references in the start button for immediate disabling
        if (startButton) {
        if ((startButton as any).setBetTabRef) {
            (startButton as any).setBetTabRef(betTab);
        }
        if ((startButton as any).setGridTabRef) {
            (startButton as any).setGridTabRef(gridTab);
        }
        if ((startButton as any).setHomeRef) {
            (startButton as any).setHomeRef(home);
        }
        if ((startButton as any).setToolbarRef) {
            (startButton as any).setToolbarRef(toolbar);
        }
        }

        // Trigger resize to ensure proper positioning
        if (startButton && (startButton as any).resize) {
        (startButton as any).resize(app.screen.width, app.screen.height);
        }

        console.log('✅ Start button created and integrated');
    };

  // STEP 4: Remove splash screen (moved outside to be accessible in async callbacks)
    let splashRemoved = false;
    const removeSplashScreen = (): void => {
        if (splashRemoved) {
        console.log('🎨 Splash screen already removed, skipping...');
        return;
        }
        console.log('🎨 Removing splash screen...');
        hideSplash();
        splashRemoved = true;
        console.log('✅ Splash screen removed');
    };

    // Execute the proper flow sequence
    const executeMainFlow = async (): Promise<void> => {
        try {
        // Step 1: Get balance
        await getBalance();

        // Step 2: Check pending games
        const hasPendingGame = await checkAndHandlePendingGames();

        // Step 3: Create start button
        createStartButtonStep();

        // Step 4: Remove splash screen (only if no pending game, otherwise wait for restoration)
        if (!hasPendingGame) {
            removeSplashScreen();
        } else {
            console.log('🎨 Pending game detected - keeping splash screen until restoration completes');

            // Fallback timeout to ensure splash screen is removed even if restoration fails
            setTimeout(() => {
            console.log('🎨 Fallback timeout: Removing splash screen after 5 seconds');
            removeSplashScreen();
            }, 5000);
        }

        console.log('✅ Main flow completed successfully');
        // console.log(`📊 Flow summary: Balance loaded, Pending game: ${hasPendingGame ? 'Yes' : 'No'}, Start button created, Splash removed: ${!hasPendingGame}`);

        } catch (error) {
        console.error('❌ Error in main flow:', error);
        // Fallback: still create start button and remove splash
        createStartButtonStep();
        removeSplashScreen();
        }
    };

  // Add listener for pending game restoration completion to remove splash screen
    GlobalState.addPendingGameRestoreCompleteListener(() => {
        console.log('🎨 Pending game restoration completed - removing splash screen');
        // Add a small delay to ensure all visual updates are complete
        setTimeout(() => {
        removeSplashScreen();
        }, 100);
    });

    // Start the main flow
    executeMainFlow();

    const resize = () => {
        const newWidth = app.screen.width;
        const newHeight = app.screen.height;
        
        // Update all components using their resize methods
        if (background && (background as any).resize) {
        (background as any).resize(newWidth, newHeight);
        }

        if (home && (home as any).resize) {
        (home as any).resize(newWidth, newHeight);
        }

        if (balanceTab && (balanceTab as any).resize) {
        (balanceTab as any).resize(newWidth, newHeight);
        }

        if (title && (title as any).resize) {
        (title as any).resize(newWidth, newHeight);
        }

        if (bottombar && (bottombar as any).resize) {
        (bottombar as any).resize(newWidth, newHeight);
        }

        if (betTab && (betTab as any).resize) {
        (betTab as any).resize(newWidth, newHeight);
        }

        if (gridTab && (gridTab as any).resize) {
        (gridTab as any).resize(newWidth, newHeight);
        }

        if (toolbar && (toolbar as any).resize) {
        (toolbar as any).resize(newWidth, newHeight);
        }

        // Only resize start button if it exists
        if (startButton && (startButton as any).resize) {
        (startButton as any).resize(newWidth, newHeight);
        }

        if (mines && (mines as any).resize) {
        (mines as any).resize(newWidth, newHeight);
        }

        // if (bottomTextDisplay && (bottomTextDisplay as any).resize) {
        //   (bottomTextDisplay as any).resize(newWidth, newHeight);
        // }
    };

    let resizeTimeout = null;
    // Add resize event listener
    window.addEventListener('resize', () => {
        if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
        resize();
        }, 50);
    });
}

const checkPendingGames = async (removeSplashScreen: () => void): Promise<boolean> => {
  const ws = WebSocketService.getInstance();

  return new Promise<boolean>((resolve) => {
    console.log('🔍 === CHECKING PENDING GAMES ===');
    
    ws.send('minesweeper_game_load', {
      operation: 'minesweeper_game_load',
      data: {
        tableId: GlobalState.getTableId(),
      },
    });
    
    ws.on('minesweeper_game_load', (res) => {     
      if (res?.status === '400') {
        console.log('✅ No pending game found - clean state');
        resolve(false); // No pending game
      }
      else if (res?.status === '200 OK') {
        console.log('🎮 200 OK response received');
        
        if(res?.hasExistingGame){
          console.log(res);
          console.log('🎮 hasExistingGame is TRUE - processing restoration...');
          console.log('🎮 Restoration data:', {
            roundId: res?.roundId,
            currentRow: res?.currentRow,
            previousStake: res?.betAmount,
            gridOption: res?.gridOption,
            revealedMatrix: res?.revealedMatrix,
            rowRewards: res?.rowRewards
          });

          // Check if this is actually an active game or a completed one
          // Backend currentRow: 0 = starting position, higher numbers = progress
          // Frontend currentRow: (totalRows-1) = starting position, lower numbers = progress
          const completedRows = res?.completedRows;
          const totalRows = res.gridOption.split("x")[1];
          const total_cols = res.gridOption.split("x")[0];
          GlobalState.total_rows = totalRows;
          GlobalState.total_cols = total_cols;
          const frontendCurrentRow = totalRows - 1 - completedRows;
          const hasValidRoundId = res?.roundId && res?.roundId !== null && res?.roundId !== '';

          console.log('🎮 Game completion check:', {
            frontendCurrentRow,
            totalRows,
            hasValidRoundId,
            gameOver: res?.gameOver
          });

          if (!hasValidRoundId) {
            console.log('🎮 Game appears to be completed, invalid, or in initial state - starting fresh instead of restoring');

            // IMPORTANT: Clean up any residual state from the "initial state" game
            // if (isInitialStateGame) {
            //   console.log('🧹 Cleaning up initial state game residue...');
            //   GlobalState.resetGameState?.(true);
            // }

            resolve(false); // Don't restore, start fresh
            return;
          }

          console.log('🎮 Game is truly active - proceeding with restoration...');

          if (res?.revealedMatrix) {
            GlobalState.setGameMatrix(res.revealedMatrix);
            console.log('🎮 Restored game matrix:', res.revealedMatrix);
          }

          // STEP 1: Set grid dimensions FIRST (this will update the grid selector)
          if (res?.gridOption) {
            const [cols, rows] = res.gridOption.split("x").map((x: string) => parseInt(x));
            console.log(`🎮 Setting grid dimensions FIRST: ${cols}x${rows}`);
            GlobalState.setGridDimensions(cols, rows);
          }

          // STEP 2: Set stake amount and update bet index
          if (res?.betAmount) {
            GlobalState.setStakeAmount(res.betAmount);
            console.log(`🎮 Restored stake amount: ${res.betAmount}`);
          }
        
          

          // STEP 4: Set round ID
          GlobalState.setRoundId(res?.roundId);
          
          // STEP 5: Set current row (convert from backend to frontend coordinate system)
          if (res.currentRow !== undefined) {
            GlobalState.setCurrentRow(frontendCurrentRow);
          } else {
            // Default to starting position if no current row provided
            GlobalState.setCurrentRow(GlobalState.total_rows - 1);
          }
          
          // STEP 6: Calculate and set the current reward based on current row
          // Set the calculated reward
          if(res?.rowRewards){
            const calculatedReward = res?.betAmount * res?.rowRewards[res?.completedRows - 1];
            console.log(`🎮 Setting reward to: ${calculatedReward}`);
            GlobalState.setReward(calculatedReward);
          }

          // STEP 7: Set game as started BEFORE triggering pending game restore
          console.log('🎮 Setting game as started for pending game...');
          GlobalState.setGameStarted(true);

           // STEP 8: Delay the visual restoration to ensure all state is set
          setTimeout(() => {
            console.log('🎨 About to trigger pending game restore...');
            console.log('🎨 Current state before restoration:', {
              currentRow: GlobalState.getCurrentRow(),
              reward: GlobalState.getReward(),
              gameStarted: GlobalState.getGameStarted(),
              roundId: GlobalState.getRoundId(),
              gridDimensions: `${GlobalState.total_cols}x${GlobalState.total_rows}`
            });

            if (GlobalState.triggerPendingGameRestore) {
              console.log('🎨 CALLING triggerPendingGameRestore() NOW!');
              GlobalState.triggerPendingGameRestore();
              console.log('🎨 triggerPendingGameRestore() called successfully');
            } else {
              console.error('⚠️ GlobalState.triggerPendingGameRestore is not available!');
              console.log('⚠️ Available GlobalState methods:', Object.keys(GlobalState));
              // Fallback: remove splash screen if restoration fails
              setTimeout(() => {
                console.log('🎨 Fallback: Removing splash screen after restoration failure');
                removeSplashScreen();
              }, 100);
            }
          }, 500);

          resolve(true);
        } else {
          console.log('🔍 hasExistingGame is FALSE or missing');
          resolve(true);
        }
      } else {
        console.warn('⚠️ Unknown response status:', res?.status);
        console.warn('⚠️ Full response:', res);
        resolve(false);
      }
    })
  })
};
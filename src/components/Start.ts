import { Container, Sprite, Assets, Text } from 'pixi.js'
import { createButton } from './commons/Button';
import { GlobalState } from '../globals/gameState';
import { startButtonEvents } from '../WebSockets/startEvents';
import { ActivityTypes, recordUserActivity } from '../utils/gameActivityManager';
import { SoundManager } from '../utils/SoundManager';
import { getTextAPI } from '../utils/textManager';
import { createSpriteFromLoadedAssets } from './commons/Sprites';

// Helper to make sprites clickable only on pointerup without drag
function makeSpriteClickOnReleaseOnly(sprite, onClick) {
    let pointerDown = false;
    let startX = 0, startY = 0;

    sprite.on('pointerdown', (event) => {
        pointerDown = true;
        const { x, y } = event.data.global;
        startX = x;
        startY = y;
    });

    sprite.on('pointerup', (event) => {
        if (!pointerDown) return;
        pointerDown = false;

        const { x, y } = event.data.global;
        const movementX = Math.abs(x - startX);
        const movementY = Math.abs(y - startY);
        const DRAG_THRESHOLD = 15;

        if (movementX < DRAG_THRESHOLD && movementY < DRAG_THRESHOLD) {
            onClick();
        }
    });

    sprite.on('pointerupoutside', () => {
        pointerDown = false;
    });

    sprite.on('pointercancel', () => {
        pointerDown = false;
    });
}

const createStartButton = (appWidth, appHeight, minesContainer) => {
    const BUTTON_SIZE_RATIO = 0.25;
    const BUTTON_X_RATIO = 0.87;
    const BUTTON_Y_RATIO = 0.51;
    const CLICK_DEBOUNCE_MS = 1000;

    const mainContainer = new Container();
    const startContainer = new Container();
    const collectContainer = new Container();
    const buttonSize = appHeight * BUTTON_SIZE_RATIO;
    const text = getTextAPI();

    mainContainer.zIndex = 100;
    startContainer.zIndex = 101;
    collectContainer.zIndex = 101;

    startContainer.visible = true;
    collectContainer.visible = false;

    mainContainer.addChild(startContainer);
    mainContainer.addChild(collectContainer);

    let startButtonSprite = null;
    let collectButtonSprite = null;
    let areButtonsInitialized = false;

    let betTabRef = null;
    let gridTabRef = null;
    let homeRef = null;
    let toolbarRef = null;

    let lastClickTime = 0;

    const disableUIComponents = () => {
        if (betTabRef?.switchToTextMode) betTabRef.switchToTextMode();
        if (betTabRef?.disableBetButtons) betTabRef.disableBetButtons();
        if (gridTabRef?.switchToTextMode) gridTabRef.switchToTextMode();
        if (homeRef?.disableButton) homeRef.disableButton();
        if (toolbarRef?.disableSettingsButton) toolbarRef.disableSettingsButton();
    };

    const enableUIComponents = () => {
        if (betTabRef?.switchToInteractiveMode) betTabRef.switchToInteractiveMode();
        if (betTabRef?.enableBetButtons) betTabRef.enableBetButtons();
        if (gridTabRef?.switchToInteractiveMode) gridTabRef.switchToInteractiveMode();
        if (homeRef?.enableButton) homeRef.enableButton();
        if (toolbarRef?.enableSettingsButton) toolbarRef.enableSettingsButton();
    };

    let startClickHandler = async () => {
        disableUIComponents();
        if (minesContainer?.forceCleanupAllOverlays) minesContainer.forceCleanupAllOverlays();
        if (minesContainer?.resetForFreshStart) minesContainer.resetForFreshStart();
        if (minesContainer?.disableContainer) minesContainer.disableContainer();

        const startSuccess = await startButtonEvents();

        if (startSuccess) {
            if (minesContainer?.enableContainer) minesContainer.enableContainer();
            if (minesContainer?.switchCurrentRowToGreen) minesContainer.switchCurrentRowToGreen();
            GlobalState.setGameStarted(true);
        } else {
            enableUIComponents();
            if (minesContainer?.enableContainer) minesContainer.enableContainer();
            GlobalState.setGameStarted(false);
        }
    };

    let collectClickHandler = async () => {
        if (minesContainer?.disableContainer) minesContainer.disableContainer();
        if (minesContainer?.handleCollect) {
            await minesContainer.handleCollect();
        } else {
            GlobalState.setGameStarted(false);
        }
    };

    const handleStartClick = async () => {
        text.showClickGreenCell();
        recordUserActivity(ActivityTypes.GAME_START);
        const now = Date.now();
        if (now - lastClickTime < CLICK_DEBOUNCE_MS) return;
        lastClickTime = now;

        try {
            await startClickHandler();
            SoundManager.playStartClick();
        } catch (e) {
            console.error('Start click failed', e);
        }
    };

    const handleCollectClick = async () => {
        recordUserActivity(ActivityTypes.COLLECT_CLICK);
        const now = Date.now();
        if (now - lastClickTime < CLICK_DEBOUNCE_MS) return;
        lastClickTime = now;

        try {
            await collectClickHandler();
            SoundManager.playCollectClick();
        } catch (e) {
            console.error('Collect click failed', e);
        }
    };

    const createButtonSprites = () => {
        const useAnimatedStart = Assets.get('startbuttonSprite') !== undefined;
        const useAnimatedCollect = Assets.get('collectbuttonSprite') !== undefined;

        if (useAnimatedStart) {
            createSpriteFromLoadedAssets('startbuttonSprite', {
                x: appWidth * BUTTON_X_RATIO,
                y: appHeight * BUTTON_Y_RATIO,
                width: buttonSize,
                height: buttonSize,
                animationSpeed: 0.3,
                loop: true,
                autoplay: true,
                anchor: 0.5
            }).then(sprite => {
                startButtonSprite = sprite;
                startButtonSprite.eventMode = 'static';
                startButtonSprite.cursor = 'pointer';
                makeSpriteClickOnReleaseOnly(startButtonSprite, handleStartClick);
                startButtonSprite.zIndex = 100;
                startContainer.addChild(startButtonSprite);
            });
        } else {
            startButtonSprite = createButton({
                texture: Assets.get('startButton'),
                width: buttonSize,
                height: buttonSize,
                x: appWidth * BUTTON_X_RATIO,
                y: appHeight * BUTTON_Y_RATIO,
                anchorX: 0.5,
                anchorY: 0.5,
                onClick: handleStartClick
            });
            startButtonSprite.zIndex = 100;
            startContainer.addChild(startButtonSprite);
        }

        if (useAnimatedCollect) {
            createSpriteFromLoadedAssets('collectbuttonSprite', {
                x: appWidth * BUTTON_X_RATIO,
                y: appHeight * BUTTON_Y_RATIO,
                width: buttonSize,
                height: buttonSize,
                animationSpeed: 0.3,
                loop: true,
                autoplay: true,
                anchor: 0.5
            }).then(sprite => {
                collectButtonSprite = sprite;
                collectButtonSprite.eventMode = 'static';
                collectButtonSprite.cursor = 'pointer';
                makeSpriteClickOnReleaseOnly(collectButtonSprite, handleCollectClick);
                collectButtonSprite.zIndex = 100;
                collectContainer.addChild(collectButtonSprite);
            });
        } else {
            collectButtonSprite = createButton({
                texture: Assets.get('collectButton'),
                width: buttonSize,
                height: buttonSize,
                x: appWidth * BUTTON_X_RATIO,
                y: appHeight * BUTTON_Y_RATIO,
                anchorX: 0.5,
                anchorY: 0.5,
                onClick: handleCollectClick
            });
            collectButtonSprite.zIndex = 100;
            collectContainer.addChild(collectButtonSprite);
        }

        return true;
    };

    const updateButtonVisibility = () => {
        const gameStarted = GlobalState.getGameStarted();
        const currentRow = GlobalState.getCurrentRow();
        const totalRows = GlobalState.total_rows;
        const isAtInitialRow = currentRow === totalRows - 1;

        startContainer.visible = !gameStarted && !isButtonTemporarilyHidden;
        collectContainer.visible = gameStarted && !isAtInitialRow && cellClickAnimationsComplete && !isButtonTemporarilyHidden;
    };

    let cellClickAnimationsComplete = false;
    let isButtonTemporarilyHidden = false;
    let buttonHideTimeout = null;

    const initializeButton = async () => {
        if (areButtonsInitialized) return;
        createButtonSprites();

        GlobalState.addGameStartedListener(() => {
            cellClickAnimationsComplete = false;
            updateButtonVisibility();
        });

        GlobalState.addGameEndedListener(() => {
            updateButtonVisibility();
            enableUIComponents();
        });

        GlobalState.addCurrentRowChangeListener(() => updateButtonVisibility());

        areButtonsInitialized = true;
    };

    const buttonAPI = {
        initialize: initializeButton,
        updateVisibility: updateButtonVisibility,
        getContainer: () => mainContainer,
        isInitialized: () => areButtonsInitialized,
        showStart: () => { startContainer.visible = true; collectContainer.visible = false; },
        showCollect: () => { startContainer.visible = false; collectContainer.visible = true; },
        getStartContainer: () => startContainer,
        getCollectContainer: () => collectContainer,
        markAnimationsComplete: () => { cellClickAnimationsComplete = true; updateButtonVisibility(); },
        markAnimationsStarting: () => { cellClickAnimationsComplete = false; updateButtonVisibility(); },
        resetAnimationState: () => { cellClickAnimationsComplete = false; updateButtonVisibility(); },
        temporarilyHideButtons: () => {
            if (buttonHideTimeout) clearTimeout(buttonHideTimeout);
            isButtonTemporarilyHidden = true;
            updateButtonVisibility();
            buttonHideTimeout = setTimeout(() => {
                isButtonTemporarilyHidden = false;
                updateButtonVisibility();
                buttonHideTimeout = null;
            }, 1000);
        },
        setBetTabRef: (ref) => betTabRef = ref,
        setGridTabRef: (ref) => gridTabRef = ref,
        setHomeRef: (ref) => homeRef = ref,
        setToolbarRef: (ref) => toolbarRef = ref,
        disableUIComponents: disableUIComponents,
        enableUIComponents: enableUIComponents,
        setStartClickHandler: (handler) => startClickHandler = handler,
        setCollectClickHandler: (handler) => collectClickHandler = handler,
        resize: (newWidth, newHeight) => {
            const newButtonSize = newHeight * BUTTON_SIZE_RATIO;
            const newX = newWidth * BUTTON_X_RATIO;
            const newY = newHeight * BUTTON_Y_RATIO;
            if (startButtonSprite) {
                startButtonSprite.x = newX;
                startButtonSprite.y = newY;
                startButtonSprite.width = newButtonSize;
                startButtonSprite.height = newButtonSize;
            }
            if (collectButtonSprite) {
                collectButtonSprite.x = newX;
                collectButtonSprite.y = newY;
                collectButtonSprite.width = newButtonSize;
                collectButtonSprite.height = newButtonSize;
            }
        }
    };

    Object.assign(mainContainer, buttonAPI);
    setTimeout(() => initializeButton(), 100);
    return mainContainer;
};

export default createStartButton;

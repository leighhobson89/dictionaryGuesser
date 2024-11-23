import { localize } from './localization.js';
import { setGuessCount, getGuessCount, getGuessedWord, setGuessedWord, setWordToGuess, getWordToGuess, setBeginGameStatus, getDictionaryData, setDictionaryData, getInitialSpeedMovingEnemy, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisiblePaused, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState } from './constantsAndGlobalVars.js';

let playerObject = getPlayerObject();
let movingEnemy = {};

const enemySquares = [];

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    const ctx = getElements().canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const canvasWidth = container.clientWidth * 0.8;
        const canvasHeight = container.clientHeight * 0.8;

        getElements().canvas.style.width = `${canvasWidth}px`;
        getElements().canvas.style.height = `${canvasHeight}px`;

        getElements().canvas.width = canvasWidth;
        getElements().canvas.height = canvasHeight;
        
        ctx.scale(1, 1);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    if (getBeginGameStatus()) {
        setBeginGameStatus(false);
    }
    setGameState(getGameVisibleActive());

    setWordToGuess(getRandomWord());

    gameLoop();
}

export function gameLoop() {
    const ctx = getElements().canvas.getContext('2d');
    if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        if (gameState === getGameVisibleActive()) {
            draw(ctx);
        }

        requestAnimationFrame(gameLoop);
    }
}

export async function loadDictionaryData(dictionaryUrl) {
    try {
        // Load the dictionary data
        const response = await fetch(dictionaryUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dictionaryData = await response.json();

        setDictionaryData(dictionaryData);
        console.log("Dictionary data loaded:", getDictionaryData());
    } catch (error) {
        console.error("Error loading dictionary data:", error);
    }
}

function draw(ctx) {
    const canvasWidth = getElements().canvas.width;
    const canvasHeight = getElements().canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    //Stuff to draw
    drawWordToGuessText(ctx, canvasWidth, canvasHeight);
}

function drawWordToGuessText(ctx, canvasWidth, canvasHeight) {
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";

    ctx.fillText(`Word To Guess: ${getWordToGuess()}`, canvasWidth / 2, 40);
    ctx.fillText(`Current Guess: ${getGuessedWord()}`, canvasWidth / 2, 80);
    ctx.fillText(`Number of Guesses: ${getGuessCount()}`, canvasWidth / 2, 120); 
}


export function getRandomWord() {
    const dictionaryData = getDictionaryData();
    const keys = Object.keys(dictionaryData);
    const numberOfPairs = keys.length;

    if (numberOfPairs === 0) {
        throw new Error("The dictionary is empty!");
    }

    let validKey = null;

    // Loop until a valid key is found
    while (!validKey) {
        const randomIndex = Math.floor(Math.random() * numberOfPairs);
        const randomKey = keys[randomIndex];

        // Check if the key contains only alphabetic characters
        if (/^[a-zA-Z]+$/.test(randomKey)) {
            validKey = randomKey.charAt(0).toUpperCase() + randomKey.slice(1);
        }
    }

    return validKey;
}

//===============================================================================================================


export function setGameState(newState) {
    console.log("Setting game state to " + newState);
    setGameStateVariable(newState);

    switch (newState) {
        case getMenuState():
            getElements().menu.classList.remove('d-none');
            getElements().menu.classList.add('d-flex');
            getElements().buttonRow.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-flex');
            getElements().canvasContainer.classList.remove('d-flex');
            getElements().canvasContainer.classList.add('d-none');
            getElements().returnToMenuButton.classList.remove('d-flex');
            getElements().returnToMenuButton.classList.add('d-none');
            getElements().newWord.classList.add('d-none');
            getElements().guessWord.classList.add('d-none');

            console.log("Language is " + getLanguage());
            break;
        case getGameVisiblePaused():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            getElements().newWord.classList.add('d-none');
            getElements().guessWord.classList.add('d-none');
            break;
        case getGameVisibleActive():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            getElements().newWord.classList.remove('d-none');
            getElements().guessWord.classList.remove('d-none');
            break;
    }
}


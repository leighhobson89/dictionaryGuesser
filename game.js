import { localize } from './localization.js';
import { setGuessingInProcess, getGuessingInProcess, setGuessStringArray, getGuessStringArray, setGuessCount, getGuessCount, getGuessedWord, setGuessedWord, setWordToGuess, getWordToGuess, setBeginGameStatus, getDictionaryData, setDictionaryData, setGameStateVariable, getBeginGameStatus, getPlayerObject, getMenuState, getGameVisiblePaused, getGameVisibleActive, getElements, getLanguage, gameState } from './constantsAndGlobalVars.js';

let playerObject = getPlayerObject();
let movingEnemy = {};

const enemySquares = [];

let letterRewards = {};
let wordLengthHistory = [];
let wordRewards = {};
let guessRewardHistory = [];
let stagnantGuessCount = 0;
let lockedLetters = {};
let wordWithHighestReward = ''; // Add this at the top of your code
let maxRewardAchieved = 0; // This will store the highest reward


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

        if (getGuessingInProcess()) {
            processGuessTurn();
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

    // Stuff to draw
    drawWordToGuessText(ctx, canvasWidth, canvasHeight);

    // Draw the highest reward and associated word on the canvas
    drawHighestRewardInfo(ctx, canvasWidth, canvasHeight);
}

function drawHighestRewardInfo(ctx, canvasWidth, canvasHeight) {
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";

    // Draw the highest reward and word at the bottom of the canvas
    ctx.fillText(`Highest Reward: ${maxRewardAchieved} - Word: ${wordWithHighestReward}`, canvasWidth / 2, canvasHeight - 40);
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


export function guessWord() {
    processGuessTurn();
}

export function processGuessTurn() {
    incrementNumberOfGuessesAndOutputToCanvas(); // Increment and update the guess count on the UI
    thinkOfAWordToGuessAndOutputToCanvas(); // Generate and output a new word guess
    checkGuess(); // Check the guessed word against the answer
}

//--------------------------------------------------------------------------------------------

// Increment guess count and update the canvas
export function incrementNumberOfGuessesAndOutputToCanvas() {
    const currentGuessCount = getGuessCount();
    setGuessCount(currentGuessCount + 1);
}

// Generate a word guess, calculate its reward, and update rewards
export function thinkOfAWordToGuessAndOutputToCanvas() {
    const result = generateFormattedWord(); // Generate a new guessed word and calculate its reward
    const wordBeingGuessed = result.word;
    const rewardScore = result.rewardScore;

    setGuessStringArray(wordBeingGuessed);
    setGuessedWord(wordBeingGuessed);

    // Update rewards for the guessed word
    updateWordRewards(wordBeingGuessed, rewardScore);

    console.log(`Guessed Word: ${wordBeingGuessed}, Reward: ${rewardScore}`);
}

//--------------------------------------------------------------------------------------------

function generateFormattedWord() {
    const answer = getWordToGuess(); // The word to guess
    let word = '';
    let rewardScore = 0;
    let guessedLetters = [];
    let letterCount = {};

    // Track incorrect guesses per position
    let incorrectGuessesAtPositions = Array(answer.length).fill(0); // Array to track incorrect guesses per position

    // Count occurrences of each letter in the answer
    for (let letter of answer) {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
    }

    // Adjust guessed length based on past rewards
    const guessedLength = adjustWordLengthGuess();

    // Generate a word of the determined length
    while (word.length < guessedLength) {
        const availableLetters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(letter => !guessedLetters.includes(letter));
        
        let nextLetter = chooseBestLetter(availableLetters, word); // This will now consider locked letters

        // Skip positions that are locked and already filled with correct letters
        if (lockedLetters[word.length] !== undefined) {
            // If the position is locked, don't guess it and just append the locked letter
            word += lockedLetters[word.length]; // Add the locked letter at that position
        } else {
            // Check if the current position has been guessed incorrectly 5 times in a row
            if (incorrectGuessesAtPositions[word.length] >= 5 && lockedLetters[word.length] === undefined) {
                // If the position has been guessed incorrectly 5 times, try a low-reward letter
                nextLetter = chooseLowRewardLetter();
                console.log(`Repeated incorrect guess for position ${word.length}, using low-reward letter: ${nextLetter}`);
            }

            // Check if the letter is correct and in the right position
            if (answer.includes(nextLetter)) {
                const correctPosition = answer[word.length] === nextLetter; // Check if it's in the correct position
                if (correctPosition) {
                    rewardScore += 500; // Big reward for a correct letter in the correct position
                    lockedLetters[word.length] = nextLetter; // Lock this letter at its position
                } else {
                    rewardScore += 10; // Smaller reward for a correct letter in the wrong position
                }
            } else {
                rewardScore -= 10; // Penalize incorrect letters
                incorrectGuessesAtPositions[word.length] += 1; // Increment incorrect guesses count for this position
            }

            word += nextLetter; // Add the letter to the word
            guessedLetters.push(nextLetter); // Keep track of the guessed letters
        }

        updateLetterRewards(nextLetter, rewardScore); // Update rewards for the letter
    }

    // Handle stagnant guesses
    handleStagnantGuesses(word, rewardScore);

    // Capitalize the first letter of the word
    word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    // Check if the guessed word matches the answer
    if (word === answer) {
        rewardScore += 100; // Big reward for guessing the correct word
    }

    // Update word length history
    updateWordLengthHistory(word.length, rewardScore);

    // Track the word with the highest reward
    if (rewardScore > maxRewardAchieved && word) {
        maxRewardAchieved = rewardScore;
        wordWithHighestReward = word; // Store the word with the highest reward
    }

    return { word, rewardScore };
}
function chooseLowRewardLetter() {
    let lowestLetter = null;
    let lowestReward = Infinity;

    // Go through all letters and find the one with the lowest average reward
    for (let letter of 'abcdefghijklmnopqrstuvwxyz') {
        const avgReward = getAverageReward(letter);
        if (avgReward < lowestReward) {
            lowestLetter = letter;
            lowestReward = avgReward;
        }
    }

    return lowestLetter;
}




function handleStagnantGuesses(currentWord, currentReward) {
    // Update the max reward achieved if the current reward is higher
    if (currentReward > maxRewardAchieved) {
        maxRewardAchieved = currentReward;
        stagnantGuessCount = 0; // Reset stagnant guess counter
    } else {
        stagnantGuessCount++; // Increment stagnant guess counter
    }

    // If 100 guesses pass without improvement
    if (stagnantGuessCount >= 100) {
        // Try to find a letter that has not been used yet
        const unusedLetters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(letter => !currentWord.includes(letter));
        let replacementLetter;

        if (unusedLetters.length > 0) {
            // Pick a completely new letter if available
            replacementLetter = unusedLetters[Math.floor(Math.random() * unusedLetters.length)];
        } else {
            // If no new letters are available, replace the lowest-rewarding letter
            const lowestRewardingLetter = findLowestRewardingLetter(currentWord);
            replacementLetter = chooseBestLetter('abcdefghijklmnopqrstuvwxyz'.split(''), currentWord); // Pick the best letter available
        }

        // Replace the lowest-rewarding letter with the new letter, but avoid replacing locked letters
        const lowestRewardingIndex = currentWord.indexOf(findLowestRewardingLetter(currentWord));
        if (lockedLetters[lowestRewardingIndex] === undefined) {
            currentWord = currentWord.replace(currentWord[lowestRewardingIndex], replacementLetter); // Replace letter
        }

        console.log(`Stagnation adjustment: Replaced letter at index ${lowestRewardingIndex} with '${replacementLetter}'. New word: ${currentWord}`);
        stagnantGuessCount = 0; // Reset the stagnant guess counter
    }
}



function analyzeAndAdjustGuesses(currentWord) {
    // Track the current word and reward
    const currentReward = calculateWordReward(currentWord); // Function to calculate the reward for a word
    guessRewardHistory.push({ word: currentWord, reward: currentReward });

    // Keep the history limited to the last 10 guesses
    if (guessRewardHistory.length > 10) {
        guessRewardHistory.shift();
    }

    // Check if the highest reward has improved in the last 10 guesses
    const highestReward = Math.max(...guessRewardHistory.map(guess => guess.reward));
    const noImprovement = guessRewardHistory.every(guess => guess.reward < highestReward);

    if (noImprovement) {
        // Find the lowest-rewarding letter
        const lowestRewardingLetter = findLowestRewardingLetter(currentWord);

        // Replace the lowest-rewarding letter with a new letter
        const availableLetters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(letter => !currentWord.includes(letter));
        const replacementLetter = chooseBestLetter(availableLetters);

        // Swap the lowest-rewarding letter with the replacement letter
        currentWord = currentWord.replace(lowestRewardingLetter, replacementLetter);
        console.log(`Adjusted word by replacing '${lowestRewardingLetter}' with '${replacementLetter}'. New word: ${currentWord}`);
    }
}

function findLowestRewardingLetter(word) {
    let lowestLetter = null;
    let lowestReward = Infinity;

    for (let letter of word) {
        const avgReward = getAverageReward(letter);
        if (avgReward < lowestReward) {
            lowestLetter = letter;
            lowestReward = avgReward;
        }
    }

    return lowestLetter;
}

function calculateWordReward(word) {
    let totalReward = 0;

    for (let letter of word) {
        totalReward += getAverageReward(letter);
    }

    return totalReward;
}

function chooseBestLetter(availableLetters, currentWord) {
    let bestLetter = null;
    let bestReward = -Infinity;

    // Filter available letters to exclude already locked positions
    const unlockedPositions = currentWord.split('').map((letter, index) => {
        return lockedLetters[index] ? null : index;  // Only consider unlocked positions
    }).filter(index => index !== null); // Remove null values from the positions array

    // Only consider available letters for positions that are not locked
    for (let letter of availableLetters) {
        const avgReward = getAverageReward(letter);
        if (avgReward > bestReward) {
            bestLetter = letter;
            bestReward = avgReward;
        }
    }

    return bestLetter;
}



// Update rewards for a letter
function updateLetterRewards(letter, reward) {
    if (!letterRewards[letter]) {
        letterRewards[letter] = { totalReward: 0, count: 0 };
    }
    letterRewards[letter].totalReward += reward;
    letterRewards[letter].count += 1;
}

// Calculate average reward for a letter
function getAverageReward(letter) {
    if (!letterRewards[letter]) return 0;
    const { totalReward, count } = letterRewards[letter];
    return totalReward / count;
}

//--------------------------------------------------------------------------------------------

// Update rewards for a guessed word
function updateWordRewards(word, reward) {
    if (!wordRewards[word]) {
        wordRewards[word] = { totalReward: 0, count: 0 };
    }
    wordRewards[word].totalReward += reward;
    wordRewards[word].count += 1;
}

// Adjust word length guess based on reward history
function adjustWordLengthGuess() {
    if (wordLengthHistory.length === 0) {
        return Math.floor(Math.random() * 6) + 3; // Random guess if no history
    }

    let totalReward = 0;
    let totalGuesses = 0;
    let mostCommonCorrectLength = null;
    let lengthFrequency = {}; // To count occurrences of guessed lengths with high rewards

    for (let history of wordLengthHistory) {
        totalReward += history.reward;
        totalGuesses++;

        // Track frequency of lengths with high rewards
        if (history.reward > 50) {
            lengthFrequency[history.guessedLength] = (lengthFrequency[history.guessedLength] || 0) + 1;
        }
    }

    // Determine the most common high-reward length
    mostCommonCorrectLength = Object.entries(lengthFrequency).reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0])[0];

    const averageReward = totalReward / totalGuesses;

    // Favor the most common high-reward length if significant data exists
    if (mostCommonCorrectLength && lengthFrequency[mostCommonCorrectLength] > 2) {
        return parseInt(mostCommonCorrectLength, 10); // Return as an integer
    }

    // If average reward is high, favor the actual word length
    if (averageReward > 50) {
        return getWordToGuess().length;
    }

    // Otherwise, guess randomly near the actual length
    const wordToGuessLength = getWordToGuess().length;
    return Math.max(3, Math.floor(wordToGuessLength + Math.random() * 2 - 1)); // Keep length >= 3
}

function updateWordLengthHistory(guessedLength, reward) {
    const actualLength = getWordToGuess().length;

    // Boost reward significantly if guessed length is correct
    if (guessedLength === actualLength) {
        reward += 50; // Significant boost for correct length
    }

    // Store the guessed length and reward in the history
    wordLengthHistory.push({ guessedLength, reward });

    // Limit the history size to 200 entries
    if (wordLengthHistory.length > 200) {
        wordLengthHistory.shift(); // Prevent memory overflow
    }
}

//--------------------------------------------------------------------------------------------

// Check the guessed word against the answer
export function checkGuess() {
    const guessedWord = getGuessedWord();
    const wordToGuess = getWordToGuess();
    const ctx = getElements().canvas.getContext('2d');
    const canvasWidth = getElements().canvas.width;
    const canvasHeight = getElements().canvas.height;

    ctx.clearRect(0, canvasHeight / 2 - 12, canvasWidth, 24);

    if (guessedWord === wordToGuess) {
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFF";

        ctx.fillText("GUESSED THE WORD!", canvasWidth / 2, canvasHeight / 2);

        setGuessingInProcess(false); // Stop guessing if the word is correct
    } else {
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FF0000";

        ctx.fillText("WRONG!", canvasWidth / 2, canvasHeight / 2);

        setGuessingInProcess(true); // Continue guessing
    }
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

    //return validKey;
    return "Helicopter";
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

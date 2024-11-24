import { localize } from './localization.js';
import { getAIKnowledge, setAIKnowledge, setGuessingInProcess, getGuessingInProcess, setGuessStringArray, getGuessStringArray, setGuessCount, getGuessCount, getGuessedWord, setGuessedWord, setWordToGuess, getWordToGuess, setBeginGameStatus, getDictionaryData, setDictionaryData, setGameStateVariable, getBeginGameStatus, getPlayerObject, getMenuState, getGameVisiblePaused, getGameVisibleActive, getElements, getLanguage, gameState } from './constantsAndGlobalVars.js';

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

export async function gameLoop() {
    const ctx = getElements().canvas.getContext('2d');
    if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        if (gameState === getGameVisibleActive()) {
            draw(ctx);
        }

        if (getGuessingInProcess()) {
            await processGuessTurn();
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

    // Clear the previous drawing
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw the word to guess
    drawWordToGuessText(ctx, canvasWidth, canvasHeight);

    // Draw the current guess and feedback from AI knowledge
    drawCurrentGuessAndFeedback(ctx, canvasWidth, canvasHeight);
}

function drawWordToGuessText(ctx, canvasWidth, canvasHeight) {
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";

    // Define initial Y position for the first section
    let yPos = 40;

    // Draw the word to guess
    ctx.fillText(`Word To Guess: ${getWordToGuess()}`, canvasWidth / 2, yPos);

    // Move Y position down to avoid overlap
    yPos += 40;

    ctx.fillText(`Current Guess: ${getGuessedWord()}`, canvasWidth / 2, yPos);

    // Move Y position down
    yPos += 40;

    ctx.fillText(`Number of Guesses: ${getGuessCount()}`, canvasWidth / 2, yPos);

    // Feedback on length knowledge
    const targetLength = getWordToGuess().length;
    const currentGuessLength = getGuessedWord().length;
    const lengthDifference = Math.abs(targetLength - currentGuessLength);

    // Move Y position down for the length feedback
    yPos += 40;

    // Display the AI's current guess length
    ctx.fillText(`AI Guess Length: ${currentGuessLength}`, canvasWidth / 2, yPos);
    
    // Move Y position down
    yPos += 40;
    
    // Display how close the AI's guess length is to the target word length
    if (currentGuessLength === targetLength) {
        ctx.fillStyle = "#00FF00"; // Green for exact match
        ctx.fillText("Correct Length!", canvasWidth / 2, yPos);
    } else {
        ctx.fillStyle = "#FF0000"; // Red for incorrect length
        ctx.fillText(`Length Difference: ${lengthDifference}`, canvasWidth / 2, yPos);
    }
}

function drawCurrentGuessAndFeedback(ctx, canvasWidth, canvasHeight) {
    const guessedWord = getGuessedWord();
    const aiKnowledge = getAIKnowledge(); // Access the global AI knowledge

    // Define initial Y position for feedback
    let yPos = 240;

    // Draw the guess
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";
    ctx.fillText(`Guess: ${guessedWord}`, canvasWidth / 2, yPos);

    // Move Y position down
    yPos += 40;

    // Draw feedback from AI knowledge
    ctx.font = "20px Arial";
    ctx.fillStyle = "#FF0000";  // Red for feedback

    let feedbackText = `Feedback: `;

    // Display correct letters in correct positions
    feedbackText += `Correct Pos: ${aiKnowledge.correctLetters.length} `;
    // Display letters that are in the word but incorrect position
    feedbackText += `Incorrect Pos: ${aiKnowledge.possibleLetters.length} `;
    // Display excluded letters
    feedbackText += `Excluded Letters: ${aiKnowledge.incorrectLetters.length}`;

    // Show feedback on canvas
    ctx.fillText(feedbackText, canvasWidth / 2, yPos);

    // Draw the length feedback
    const targetLength = getWordToGuess().length;
    const currentGuessLength = guessedWord.length;
    ctx.fillText(`Target Length: ${targetLength}`, canvasWidth / 2, yPos + 40);
    ctx.fillText(`Current Guess Length: ${currentGuessLength}`, canvasWidth / 2, yPos + 80);

    if (currentGuessLength === targetLength) {
        ctx.fillStyle = "#00FF00"; // Green for exact match
        ctx.fillText("Correct Length!", canvasWidth / 2, yPos + 120);
    } else {
        ctx.fillStyle = "#FF0000"; // Red for incorrect length
        ctx.fillText(`Length Difference: ${Math.abs(targetLength - currentGuessLength)}`, canvasWidth / 2, yPos + 120);
    }
}

export function guessWord() {
    processGuessTurn();
}

export async function processGuessTurn() {
    incrementNumberOfGuessesAndOutputToCanvas(); // Increment and update the guess count on the UI
    thinkOfAWordToGuessAndOutputToCanvas(); // Generate and output a new word guess
    await checkGuess(); // Check the guessed word against the answer
}

export function incrementNumberOfGuessesAndOutputToCanvas() {
    const currentGuessCount = getGuessCount();
    setGuessCount(currentGuessCount + 1);
}

export function thinkOfAWordToGuessAndOutputToCanvas() {
    // Step 1: Generate the AI's next guess
    const aiGuess = generateNextGuess();

    // Step 2: Display the guess on the canvas
    setGuessedWord(aiGuess);

    // Step 3: Generate feedback for the AI's guess
    const feedback = generateFeedbackForGuess(aiGuess);

    // Step 4: Update the AI's knowledge with the feedback
    updateAIKnowledge(feedback);
}

// Global variables to track feedback for learning
let lastGuessLength = 0; // Length of the last guess
let currentScore = 0; // Score to reward or penalize

export function generateNextGuess() {
    const targetWordLength = getWordToGuess().length; // Target word length
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Step 1: Decide word length
    let guessedLength = generateWordLength(targetWordLength);

    // Step 2: Generate a random word of the guessed length
    let guess = "";
    for (let i = 0; i < guessedLength; i++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length);
        guess += alphabet[randomIndex];
    }

    // Capitalize the first letter
    guess = guess.charAt(0).toUpperCase() + guess.slice(1).toLowerCase();

    // Step 3: Return the generated guess
    return guess;
}

function generateWordLength(targetWordLength) {
    if (lastGuessLength !== 0) {
        const lengthDiffBefore = Math.abs(lastGuessLength - targetWordLength);
        const lengthDiffNow = Math.abs(lastGuessLength - targetWordLength);

        if (lengthDiffNow < lengthDiffBefore) {
            currentScore += 10;
        } else if (lengthDiffNow === 0) {
            currentScore += 50;
        } else {
            currentScore -= 5;
        }
    }

    if (lastGuessLength === targetWordLength) {
        return lastGuessLength;
    }

    const randomVariance = Math.random() < 0.5 ? -1 : 1;
    const newLength = Math.max(1, lastGuessLength + randomVariance);
    lastGuessLength = newLength;

    return newLength;
}

const feedback = {
    correctLetters: [],    // Array to store correctly placed letters (initialized as an empty array)
    possibleLetters: [],   // Array to store letters that are in the word but not in the correct positions (initialized as an empty array)
    incorrectLetters: [],   // Array to store letters that are not in the word (initialized as an empty array)
    lengthMatched: false,   // Boolean to track whether the correct word length has been matched (initialized as false)
    lastLengthDifference: null, // Tracks the difference between the length of the last guess and the target word (initialized as null)
    guesses: []             // Array to store previous guesses and their feedback (initialized as an empty array)
};

export function generateFeedbackForGuess(aiGuess) {
    const targetWord = getWordToGuess();

    const targetLength = targetWord.length;
    const guessLength = aiGuess.length;

    // Step 1: Check if the guess length matches the target length
    if (guessLength === targetLength) {
        feedback.lengthExactMatch = true;
        feedback.lengthDifference = 0; // No difference if lengths are the same
    } else {
        feedback.lengthDifference = Math.abs(targetLength - guessLength); // Calculate length difference
    }

    // Step 2: Create arrays to keep track of the letters in the target and guess
    let targetLetters = Array.from(targetWord);
    let guessLetters = Array.from(aiGuess);

    // Step 3: Check for correct letters in the correct position
    for (let i = 0; i < targetWord.length; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            feedback.correctLetters.push(guessLetters[i]);
            targetLetters[i] = null;  // Mark as used
            guessLetters[i] = null;   // Mark as used
        }
    }

    // Step 4: Check for correct letters in the wrong position
    for (let i = 0; i < guessLetters.length; i++) {
        if (guessLetters[i] !== null) {  // If letter hasn't already been matched
            const index = targetLetters.indexOf(guessLetters[i]);
            if (index !== -1) {
                feedback.possibleLetters.push(guessLetters[i]);
                targetLetters[index] = null; // Mark as used
            } else {
                feedback.incorrectLetters.push(guessLetters[i]);  // Now correctly adds incorrect letters
            }
        }
    }

    return feedback;
}


function updateAIKnowledge(feedback) {
    const aiKnowledge = getAIKnowledge(); // Get current AI knowledge

    // Ensure we don't overwrite length knowledge if it's already discovered
    const targetLength = getWordToGuess().length;
    if (!aiKnowledge.wordLength) {
        aiKnowledge.wordLength = targetLength; // Preserve the length of the word
    }

    // Add incorrect letters to the excluded list
    feedback.incorrectLetters.forEach(letter => {
        if (!aiKnowledge.incorrectLetters.includes(letter)) {
            aiKnowledge.incorrectLetters.push(letter); // Add letter to incorrect list
        }
    });

    // Update possible letters based on feedback
    feedback.possibleLetters.forEach(letter => {
        if (!aiKnowledge.possibleLetters.includes(letter) && !aiKnowledge.incorrectLetters.includes(letter)) {
            aiKnowledge.possibleLetters.push(letter); // Add possible letter if it's not excluded
        }
    });

    // Correct letters feedback: Check for correct position letters
    feedback.correctLetters.forEach(letter => {
        // Mark letters in the correct position as 'correct'
        if (!aiKnowledge.correctLetters.includes(letter)) {
            aiKnowledge.correctLetters.push(letter); // Add to correct list
        }
    });

    // Update guessed word in AI knowledge
    setAIKnowledge(aiKnowledge); // Store the updated knowledge in the global state
}



export function processFeedbackForGuess(currentGuess, targetWord) {
    const feedback = {
        correctLetters: [],
        possibleLetters: [],
        incorrectLetters: []  // Correctly an array now
    };

    // Check for correct letters in the correct position
    for (let i = 0; i < currentGuess.length; i++) {
        if (currentGuess[i] === targetWord[i]) {
            feedback.correctLetters.push(currentGuess[i]);
        } else if (targetWord.includes(currentGuess[i])) {
            feedback.possibleLetters.push(currentGuess[i]); // Letter is in the word but in the wrong position
        } else {
            feedback.incorrectLetters.push(currentGuess[i]); // Now correctly adds incorrect letters
        }
    }

    // Update AI knowledge with the feedback from this guess
    updateAIKnowledge(feedback);

    return feedback;
}




export async function checkGuess() {
    const guessedWord = getGuessedWord();
    const wordToGuess = getWordToGuess();
    const ctx = getElements().canvas.getContext('2d');
    const canvasWidth = getElements().canvas.width;
    const canvasHeight = getElements().canvas.height;

    // Wait for 500ms delay before processing the guess
    // await delay(500); // Optional delay if needed

    // Generate feedback based on the guess
    const feedback = generateFeedbackForGuess(guessedWord);

    // Process the feedback and update AI's knowledge
    const processedFeedback = processFeedbackForGuess(guessedWord, wordToGuess);

    // Now that feedback is processed, update the AI knowledge based on the processed feedback
    updateAIKnowledge(processedFeedback);

    // Clear the canvas for the next feedback display
    ctx.clearRect(0, canvasHeight / 2 - 12, canvasWidth, 24);

    if (guessedWord === wordToGuess) {
        // If the guess is correct, display success message
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFF";

        ctx.fillText("GUESSED THE WORD!", canvasWidth / 2, canvasHeight / 2);

        // Stop further guessing since the correct word was found
        setGuessingInProcess(false);
    } else {
        // If the guess is wrong, display failure message
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FF0000";

        ctx.fillText("WRONG!", canvasWidth / 2, canvasHeight / 2);

        // Continue guessing if the word is not correct
        setGuessingInProcess(true);
    }
}


// Helper function to add a delay using Promise
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomWord() {
    const dictionaryData = getDictionaryData();
    const keys = Object.keys(dictionaryData);
    const numberOfPairs = keys.length;

    if (numberOfPairs === 0) {
        throw new Error("The dictionary is empty!");
    }

    let validKey = null;

    while (!validKey) {
        const randomIndex = Math.floor(Math.random() * numberOfPairs);
        const randomKey = keys[randomIndex];

        if (/^[a-zA-Z]+$/.test(randomKey)) {
            validKey = randomKey.charAt(0).toUpperCase() + randomKey.slice(1);
        }
    }

    //return validKey;
    return "Ball";
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

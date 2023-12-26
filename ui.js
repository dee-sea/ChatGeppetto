//
// Inject HTML code in the page
//
const htmlContent = `
      <button id="chatgeppetto-toggle" display="none"><i class="far fa-comment"></i></button>
      <div id="chatgeppetto-widget">
        <div id="chatgeppetto-container">
          <div id="chatgeppetto-title">ChatGeppetto</div>
          <div id="chatgeppetto-messages"></div>
          <div id="chatgeppetto-input-container">
            <input
              id="chatgeppetto-input"
              type="text"
              placeholder="Write your message"
              autofocus
            />
            <div id="suggestionBox"></div>
            <button id="chatgeppetto-send">Send</button>
            <div id="loading">
              <div class="spinner"></div>
              <div class="message">Loading...</div>
            </div>
          </div>
        </div>
      </div>
`;
var chatdiv = document.createElement("div");
chatdiv.innerHTML = htmlContent;
document.body.appendChild(chatdiv);

// Handler to the ctrl+y to show/hide the widget
document.onkeydown = KeyPress;

// Read configuration from the local storage and apply it
getConfigAndApply();

// Read the visivility of the widget from the local storage
let show;
browser.storage.local.get("visible").then(onGotShow, onErrorShow);

// get refs to UI elements
const chatToggle = document.getElementById("chatgeppetto-toggle");
const chatWidget = document.getElementById("chatgeppetto-widget");
const chatContainer = document.getElementById("chatgeppetto-container");
const chatMessages = document.getElementById("chatgeppetto-messages");
const chatInput = document.getElementById("chatgeppetto-input");
const chatSendButton = document.getElementById("chatgeppetto-send");
const sendBtn = document.getElementById("chatgeppetto-send");
const sendInput = document.getElementById("chatgeppetto-input");
const loadingElement = document.getElementById("loading");

var inputHistory = [""];
var ihLength = 0;
var ihIndex = 0;

// Variables definitions
let chatVisible = false;
let answer = "";
let history = [];

// Get the chat history from the local storage
browser.storage.local.get("hist").then(onGotHist, onErrorHist);

function deleteInputHistory() {
  inputHistory = [""];
  ihLength = 0;
  ihIndex = 0;
  updateAndPersistInputHistory();
}

// Function to suggest input based on the current value of the input field
function suggestInput() {
  const inputValue = chatInput.value.toLowerCase().trim();

  // Filter inputHistory to find suggestions containing the current input value
  const suggestions = inputHistory.filter(
    (entry) => entry.toLowerCase().includes(inputValue) && entry !== inputValue
  );
  // limit the suggestions to 5
  suggestions.reverse();
  //suggestions.slice(0, 5);

  // Display suggestions in the suggestionBox div
  const suggestionBox = document.getElementById("suggestionBox");
  suggestionBox.innerHTML = "";

  suggestions.forEach((suggestion) => {
    const suggestionItem = document.createElement("div");
    suggestionItem.classList.add("suggestionItem");
    suggestionItem.textContent = suggestion;

    suggestionItem.addEventListener("click", () => {
      chatInput.value = suggestion;
      suggestionBox.style.display = "none";
    });

    suggestionBox.appendChild(suggestionItem);
  });

  // Show/hide the suggestionBox based on the presence of suggestions
  suggestionBox.style.display = suggestions.length > 0 ? "block" : "none";
}

// Function to load the input history from localStorage
function loadInputHistory() {
  browser.storage.local.get("inputHist").then(
    (result) => {
      if (result.inputHist) {
        inputHistory = JSON.parse(result.inputHist);
        ihLength = inputHistory.length - 1;
      }
    },
    (error) => {
      console.error("Error loading input history:", error);
    }
  );
}

// Load the input history when the page is loaded
loadInputHistory();

// Function to update the input history and persist it in localStorage
function updateAndPersistInputHistory() {
  // Filter inputHistory to remove empty strings
  inputHistory = inputHistory.filter((x) => x !== "");
  inputhistory = inputHistory.slice(0, 100);
  inputHistory = inputHistory.filter(onlyUnique);
  inputHistory.unshift("");
  ihLength = inputHistory.length - 1;

  // Persist the updated inputHistory in localStorage
  browser.storage.local.set({ inputHist: JSON.stringify(inputHistory) });
}

chatInput.addEventListener("input", suggestInput);

// listner for the toggle button
chatToggle.addEventListener("click", () => {
  chatVisible = !chatVisible;
  chatWidget.classList.toggle("visible", chatVisible);
  chatToggle.innerText = chatVisible ? "Close" : "Chat";
});

// add a listner to the input fied to focus make him grab focus on load
chatInput.addEventListener("load", () => {
  chatInput.focus();
});

// Add a keydown event listener to handle Arrow Up and Arrow Down keys
// Add a keydown event listener to handle Arrow Up and Arrow Down keys
chatInput.addEventListener("keydown", function (event) {
  if (event.key === "Tab") {
    // Handle Tab key for accepting suggestions
    event.preventDefault();

    const inputValue = chatInput.value.trim();

    // Filter inputHistory to find suggestions based on the current input value
    const suggestions = inputHistory.filter(
      (entry) =>
        entry.toLowerCase().startsWith(inputValue) && entry !== inputValue
    );

    // Use the first suggestion if available
    if (suggestions.length > 0) {
      chatInput.value = suggestions[0];
      document.getElementById("suggestionBox").style.display = "none";

      // Set focus back to the input field with a slight delay
      setTimeout(() => {
        chatInput.focus();
      }, 10);
    }
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    // Handle Arrow Up and Arrow Down keys
    event.preventDefault();

    const inputValue = chatInput.value.trim();

    // If the input field is not empty, navigate through suggestions
    if (inputValue !== "") {
      const suggestionBox = document.getElementById("suggestionBox");
      const suggestionItems =
        suggestionBox.getElementsByClassName("suggestionItem");

      // Determine the selected suggestion index
      let selectedSuggestionIndex = -1;
      for (let i = 0; i < suggestionItems.length; i++) {
        if (suggestionItems[i].classList.contains("selected")) {
          selectedSuggestionIndex = i;
          break;
        }
      }

      // Update the selected suggestion index based on the Arrow Up or Arrow Down key
      if (event.key === "ArrowUp") {
        if (selectedSuggestionIndex === -1) {
          selectedSuggestionIndex = suggestionItems.length - 1;
        } else {
          selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
        }
      } else if (event.key === "ArrowDown") {
        selectedSuggestionIndex = Math.min(
          selectedSuggestionIndex + 1,
          suggestionItems.length - 1
        );
      }

      // Update the selected class for suggestion items
      for (let i = 0; i < suggestionItems.length; i++) {
        suggestionItems[i].classList.remove("selected");
      }
      suggestionItems[selectedSuggestionIndex].classList.add("selected");

      // Update the input field with the selected suggestion
      chatInput.value = suggestionItems[selectedSuggestionIndex].textContent;
    } else {
      // If the input field is empty, navigate through the input history
      const userInput = chatInput.value.trim();

      if (event.key === "ArrowUp" && ihIndex < ihLength) {
        console.log("ArrowUp");
        // Move up in history
        ihIndex++;
        console.log(inputHistory[ihIndex]);
        chatInput.value = inputHistory[ihLength - ihIndex];
      } else if (event.key === "ArrowDown" && ihIndex > 0) {
        console.log("ArrowDown");
        // Move down in history
        ihIndex--;

        // Set the input value to the selected history entry
        chatInput.value =
          ihIndex === -1 ? "" : inputHistory[ihLength - ihIndex];
      } else if (event.key === "ArrowUp" && ihIndex === ihLength) {
        console.log("ArrowUp");
        // If at the bottom of history, move to the last entry
        ihIndex = 0;
        chatInput.value = inputHistory[ihLength - ihIndex];
      }
    }
  } else if (event.key === "Escape") {
    // Handle Escape key to close the suggestion list
    const suggestionBox = document.getElementById("suggestionBox");
    if (suggestionBox.style.display !== "none") {
      suggestionBox.style.display = "none";

      // Set focus back to the input field with a slight delay
      focusInput();
    }
  } else if (event.key === "Backspace" || event.key === "Delete") {
    // Handle Backspace and Delete keys to close the suggestion list when the input is empty
    if (chatInput.value.trim() === "") {
      document.getElementById("suggestionBox").style.display = "none";

      // Set focus back to the input field with a slight delay
      focusInput();
    }
  }
});

chatInput.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const userInput = chatInput.value.trim();

    // Add the entered text to history when Enter is pressed
    inputHistory.unshift(userInput);
    ihLength = inputHistory.length - 1;
    ihIndex = 0;

    // Ensure "" is always at the first position in history
    if (inputHistory[0] !== "") {
      inputHistory.unshift("");
      ihLength++;
    }

    // Limit the history to a certain number of entries if needed
    const maxHistoryLength = 100;
    if (inputHistory.length > maxHistoryLength) {
      inputHistory.pop();
      ihLength--;
    }

    // Update and persist the input history
    updateAndPersistInputHistory();

    console.log("ihLength: " + ihLength);
    console.log(inputHistory);

    if (userInput) {
      if (!userInput.startsWith(":") && !userInput.endsWith("+i")) {
        addChatMessage(you, markdownToHtml(userInput));
        history.push({ role: "user", content: userInput });
        browser.storage.local.set({ hist: JSON.stringify(history) });
      }
      sendChatMessage(userInput);
      chatInput.value = "";
      ihIndex = 0;
    }
  }
});

// listner for the input field drop event
chatInput.addEventListener("drop", (event) => {
  event.preventDefault();
  const userInput = event.dataTransfer.getData("text");
  if (userInput.startsWith("http://") || userInput.startsWith("https://")) {
    addChatMessage(you, userInput);
    sendChatMessage(userInput);
  } else {
    let selectedText =
      getText("readText") +
      getText("longSeparator") +
      userInput +
      getText("longSeparator");
    addChatMessage(you, markdownToHtml(getText("selectedText")));
    history.push({ role: "system", content: selectedText });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    addChatMessage(assistant, getText("ok"));
  }
});

// listner for the send button click event
chatSendButton.addEventListener("click", () => {
  const userInput = chatInput.value.trim();
  if (userInput) {
    addChatMessage(you, userInput);
    history.push({ role: "user", content: userInput });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    sendChatMessage(userInput);
    chatInput.value = "";
  }
});

// listner for the read-it message
browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.command === "read-it") {
    alert("read-it");
  }
});

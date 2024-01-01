browser.storage.local.get("visible").then((result) => {
  if (result.visible) {
    body = document.querySelector("body");
    body.classList.add("chatgeppetto-open");
    chatWidget.classList.add("chatgeppetto-visible");
  }
});

//
// Saved conversation management
//
// Function to populate the conversation list
async function populateConversationList() {
  const conversationList = document.getElementById(
    "chatgeppetto-converstationSwitcher",
  );
  conversationList.innerHTML = ""; // Clear previous entries

  //get the list of conversations from local storage
  browser.storage.local.get("conversations").then((result) => {
    const conversations = result.conversations || [];
    conversations.forEach((conversation, index) => {
      const conversationItem = document.createElement("div");
      conversationItem.classList.add("chatgeppetto-conversationItem");
      conversationItem.textContent = conversation.key;
      // Add a click event listener to switch to the selected conversation
      conversationItem.addEventListener("click", () =>
        switchConversation(conversation.key),
      );
      conversationList.appendChild(conversationItem);
    });
  });
}

// Function to switch to a specific conversation
async function switchConversation(name) {
  console.log("Switching to conversation:", name);
  // Get the list of conversations from local storage
  try {
    let exists = await conversationExists(name);
    if (exists) {
      removeLastHeader();
      history = await loadConversation(name);
      await addChatMessage(assistant, getText("ok"));
      browser.storage.local.set({ hist: JSON.stringify(history) });
      rebuildChatMessages(history);
    } else {
      addChatMessage(assistant, getText("invalidName"));
    }
    enableChat();
  } catch (error) {
    console.error("Error switching conversation:", error);
  }
}

//
// Initialize variables
//
let inputHistory = [""];
let ihLength = 0;
let ihIndex = 0;
let chatVisible = false;
let answer = "";
let history = [];

//
// Initialize the chat widget
//
injectHTMO();
getConfigAndApply();
browser.storage.local.get("visible").then(onGotShow, onErrorShow);
browser.storage.local.get("hist").then(onGotHist, onErrorHist);
loadInputHistory();

//
// get refs to UI elements
//
const chatWidget = document.getElementById("chatgeppetto-widget");
const chatContainer = document.getElementById("chatgeppetto-container");
const chatMessages = document.getElementById("chatgeppetto-messages");
const chatInput = document.getElementById("chatgeppetto-input");
const sendInput = document.getElementById("chatgeppetto-input");
const loadingElement = document.getElementById("chatgeppetto-loading");
const suggestionBox = document.getElementById("chatgeppetto-suggestionBox");
const conversationsList = document.getElementById(
  "chatgeppetto-converstationSwitcher",
);

//
// Assign event listeners
//
document.onkeydown = KeyPress;
browser.runtime.onMessage.addListener(handleReadItMessage);
chatInput.addEventListener("input", () => handleInputChange(chatInput));
chatInput.addEventListener("keydown", (event) =>
  handleTabKey(event, chatInput, suggestionBox, inputHistory),
);
chatInput.addEventListener("keydown", (event) =>
  handleKeyDown(
    event,
    chatInput,
    suggestionBox,
    ihIndex,
    ihLength,
    inputHistory,
  ),
);
chatInput.addEventListener("keyup", (event) =>
  handleKeyUp(event, chatInput, ihIndex, ihLength, inputHistory),
);
chatInput.addEventListener("drop", (event) =>
  handleDrop(event, chatInput, inputHistory),
);
// document.addEventListener("keydown", (event) => {
//   handleKeyDown(
//     event,
//     chatInput,
//     suggestionBox,
//     ihIndex,
//     ihLength,
//     inputHistory
//   );
// });

populateConversationList();

let isMouseNear = false;

// Add event listeners to show/hide the container
document.addEventListener("mousemove", (event) => {
  const proximityThreshold = 250; // Adjust this value based on your preference
  isMouseNear = event.clientX < proximityThreshold;
  updateContainerVisibility();
});

// Function to update the visibility of the container
function updateContainerVisibility() {
  if (isMouseNear) {
    conversationsList.classList.remove("chatgeppetto-hidden");
  } else {
    conversationsList.classList.add("chatgeppetto-hidden");
  }
}

//
// Functions
//

//
// Function to delete the input history
//
function deleteInputHistory() {
  inputHistory = [""];
  ihLength = 0;
  ihIndex = 0;
  updateAndPersistInputHistory();
}

//
// Function to suggest input based on the current value of the input field
//
function suggestInput() {
  const inputValue = chatInput.value.toLowerCase().trim();

  // Filter inputHistory to find suggestions containing the current input value
  const suggestions = inputHistory.filter(
    (entry) => entry.toLowerCase().includes(inputValue) && entry !== inputValue,
  );
  // limit the suggestions to 3
  suggestions.length = 3;
  suggestions.reverse();

  // Display suggestions in the suggestionBox div
  const suggestionBox = document.getElementById("chatgeppetto-suggestionBox");
  suggestionBox.innerHTML = "";

  suggestions.forEach((suggestion) => {
    const suggestionItem = document.createElement("div");
    suggestionItem.classList.add("chatgeppetto-suggestionItem");
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

//
// Function to load the input history from localStorage
//
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
    },
  );
}

//
// Function to update the input history and persist it in localStorage
//
function updateAndPersistInputHistory() {
  // Filter inputHistory to remove empty strings
  inputHistory = inputHistory.filter((x) => x !== "");
  inputHistory = inputHistory.slice(0, 100);
  inputHistory = inputHistory.filter(onlyUnique);
  inputHistory.unshift("");
  ihLength = inputHistory.length - 1;

  // Persist the updated inputHistory in localStorage
  browser.storage.local.set({ inputHist: JSON.stringify(inputHistory) });
}

// Function to inject the HTML for the chat widget
function injectHTMO() {
  const htmlContent = `
      <div id="chatgeppetto-widget">
        <div id="chatgeppetto-container">
          <div id="chatgeppetto-messages"></div>
            <div id="chatgeppetto-input-container">
              <input
                id="chatgeppetto-input"
                type="text"
                placeholder="Write your message"
                autofocus
              />
              <div id="chatgeppetto-suggestionBox"></div>
            </div>
        </div>
        <div id="chatgeppetto-converstationSwitcher"></div>
      </div>`;
  var chatdiv = document.createElement("div");
  chatdiv.innerHTML = htmlContent;
  document.body.appendChild(chatdiv);
  setTimeout(() => {
    console.log("chatgeppetto widget injected");
  }, 100);
}

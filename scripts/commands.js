//
// Function to handle execution flow of commands
//
async function executeCommand(message) {
  answer = "";
  //remove all dimmed chatgeppetto-message-container with class dimmed
  const listMessageContainer = document.querySelectorAll(
    ".chatgeppetto-message-container",
  );
  for (let i = 0; i < listMessageContainer.length; i++) {
    if (listMessageContainer[i].classList.contains("dimmed")) {
      listMessageContainer[i].remove();
    }
  }
  if (message.startsWith("http://") || message.startsWith("https://")) {
    //addChatMessage(you, markdownToHtml(message));
    getURL(message).then((response) => {
      enableChat();
    });
  } else if (
    (message.endsWith("+i") ||
      message.startsWith("Cherche ") ||
      message.startsWith("cherche ") ||
      message.startsWith("Recherche ") ||
      message.startsWith("recherche ") ||
      message.startsWith("Search ") ||
      message.startsWith("search ") ||
      message.startsWith("Find ") ||
      message.startsWith("find ")) &&
    !GEPPETTO_API_ENDPOINT.startsWith("https://api.openai.com")
  ) {
    searchTheWeb(message).then((response) => {
      enableChat();
    });
  } else if (message.startsWith(":readpagecontent")) {
    text = message.replace(":readpagecontent ", "");
    readPageContent(text).then((response) => {
      enableChat();
    });
  } else if (message == ":hist") {
    hist();
  } else if (message == ":deleteConfig") {
    deleteConfig();
  } else if (message == ":deleteSuggestions") {
    deleteSuggestions();
  } else if (message == ":config") {
    printConfig();
  } else if (message.startsWith(":set ")) {
    setValue(message);
  } else if (message.startsWith(":save ")) {
    save(message);
  } else if (message.startsWith(":load ")) {
    load(message);
  } else if (message.startsWith(":delete ")) {
    deleteConv(message);
  } else if (message == ":list") {
    listConversations();
  } else if (message == ":pop") {
    pop();
  } else if (message.startsWith(":push ")) {
    push(message);
  } else if (message == ":clean") {
    clean();
  } else if (message == ":clear") {
    clear();
  } else if (message.startsWith(":")) {
    helpCmd();
  } else if (message == "Help" || message == "help" || message == "?") {
    help();
  } else {
    addChatMessage(assistant, "");
    notACommand(message);
  }
}

//
// Functon tu scrap the content of a webpage
//
async function getURL(message) {
  text = await getWebpage(message);
  history.push({
    role: "system",
    content:
      getText("readText") +
      getText("longSeparator") +
      text +
      getText("longSeparator"),
  });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  addChatMessage(assistant, getText("ok"), true);
  enableChat();
}

//
// Function to make the bot search the web
//
async function searchTheWeb(message) {
  removeLastMessage();
  if (message.endsWith("+i")) {
    text = message.replace("+i", "");
  } else {
    // remove the first word
    word = message.split(" ").slice(0);
    text = message.replace(word + " ", "");
  }
  // history.push({
  //   role: "user",
  //   content: text,
  // });
  addChatMessage(you, markdownToHtml(text));
  addChatMessage(assistant, markdownToHtml(getText("searching")));
  let searchQuery = await getSearchQuery(history).then((response) => {
    return response;
  });
  searchQuery = searchQuery.replace('"', "");
  console.log("Searching the web for: " + searchQuery);
  //change the last div with class chatgeppetto-message-body text to "Searching the web for: " + searchQuery)
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);
  messageBody.innerHTML = markdownToHtml(getText("gettingPages"));
  var searchUrl = searchEngine + "?q=";
  urlsearch = searchUrl + encodeURIComponent(searchQuery);
  let searchResults = await getSearchResults(urlsearch);
  await notACommand();
  enableChat();
  return;
}

//
// Funtion to rget the selected text
//
function getSel() {
  const userInput = getSelectedText();
  const selectedText =
    getText("readText") +
    getText("longSeparator") +
    userInput +
    getText("longSeparator");
  addChatMessage(you, markdownToHtml(getText("selectedText")), true);
  history.push({ role: "system", content: selectedText });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  addChatMessage(assistant, getText("ok"));
  if (window.getSelection) {
    if (window.getSelection().empty) {
      // Chrome
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {
      // Firefox
      window.getSelection().removeAllRanges();
    }
  }
}

//
// Function to read the content of a webpage
//
async function readPageContent(text) {
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body",
  );
  const messageBody = listMessageBody.item(listMessageBody.length - 1);
  messageBody.innerHTML = "";
  history.push({
    role: "system",
    content:
      getText("readText") +
      getText("longSeparator") +
      text +
      getText("longSeparator"),
  });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  addChatMessage(assistant, getText("ok"), true);
  history.push({ role: "assistant", content: getText("ok") });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  enableChat();
  return;
}

//
// Function to print the conversation history in the console
//
async function hist() {
  console.log(history);
  enableChat();
  return;
}

//
// Function to delete the current config
//
async function deleteConfig() {
  removeLastHeader();
  await deleteConfigFromLocalStorage();
  enableChat();
  return;
}

//
// Function to delete the suggestion history
//
async function deleteSuggestions() {
  removeLastHeader();
  deleteInputHistory();
  enableChat();
  return;
}

//
// Function to print the current config
//
async function printConfig() {
  let config = await getCurrentConfig();
  // Format a pretty markdown table from the config to be printed
  let configString = "Configuration:\n\n";
  configString += "| Key | Value |\n| --- | --- |\n";
  for (let key in config) {
    configString += "| " + key + " | " + config[key] + " |\n";
  }
  addChatMessage(assistant, markdownToHtml(configString), true);
  await getConfigAndApply();
  enableChat();
  return;
}

//
// Function to set a config value
//
async function setValue(message) {
  setConfig(message);

  enableChat();
  return;
}

//
// Function to save the current conversation
//
async function save(message) {
  message = message.replace(":save ", "");
  let exists = await conversationExists(message);
  if (exists) {
    addChatMessage(assistant, getText("alreadyExists"), true);
    enableChat();
    return;
  }
  if (message.match(/^[a-zA-Z0-9]+$/)) {
    removeLastHeader();
    await saveConversation(message, history);
    await populateConversationList();
    await addChatMessage(assistant, getText("ok"), true);
  } else {
    addChatMessage(assistant, getText("invalidName"), true);
  }
  enableChat();
  return;
}

//
// Function to load a saved conversation
//
async function load(message) {
  message = message.replace(":load ", "");
  let exists = await conversationExists(message);
  if (exists) {
    removeLastHeader();
    history = await loadConversation(message);
    await addChatMessage(assistant, getText("ok"), true);
    browser.storage.local.set({ hist: JSON.stringify(history) });
    rebuildChatMessages(history);
  } else {
    addChatMessage(assistant, getText("invalidName"), true);
  }
  enableChat();
}

//
// Function to delete a saved conversation
//
async function deleteConv(message) {
  message = message.replace(":delete ", "");
  let exists = await conversationExists(message);
  if (exists) {
    await deleteConversation(message);
    await addChatMessage(assistant, getText("ok"), true);
  } else {
    addChatMessage(assistant, getText("invalidName"), true);
  }
  populateConversationList();
  enableChat();
}

//
// Function to list the saved conversations
//
async function listConversations() {
  removeLastHeader();
  let list = await listSavedConversations();
  let convlist = getText("savedConversations") + "\n\n";
  for (let i = 0; i < list.length; i++) {
    convlist += i + 1 + ". " + list[i].key + "\n";
  }
  await addChatMessage(assistant, markdownToHtml(convlist), true);
  enableChat();
  return;
}

async function pop() {
  let poppedMessage;
  do {
    poppedMessage = history.pop();
    removeLastMessage();
  } while (poppedMessage && poppedMessage.role === "system");
  browser.storage.local.set({ hist: JSON.stringify(history) });
  rebuildChatMessages(history);
  enableChat();
  focusInput();
}

//
// Function to inject a message in the conversation
//
async function push(message) {
  message = message.replace(":push ", "");
  let role = message.split(" ")[0];
  let content = message.replace(role + " ", "");
  if (
    role == "user" ||
    role == "assistant" ||
    role == "system" ||
    role == you ||
    role == assistant
  ) {
    if (role == you) {
      role = "user";
      name = you;
    } else if (role == assistant) {
      role = "assistant";
      name = assistant;
    } else if (role == "user") {
      name = you;
    } else if (role == "assistant") {
      name = assistant;
    } else if (role == "system") {
      history.push({
        role: role,
        content: content,
      });
      browser.storage.local.set({ hist: JSON.stringify(history) });
      enableChat();
      return;
    }
    addChatMessage(name, markdownToHtml(content));
    history.push({
      role: role,
      content: content,
    });
    browser.storage.local.set({ hist: JSON.stringify(history) });
    enableChat();
    return;
  } else {
    addChatMessage(assistant, getText("invalidRole"), true);
    enableChat();
    return;
  }
}

//
// Function to clean the conversation history from system messages
//
async function clean() {
  removeLastMessage();
  history = await cleanHistory(history);
  browser.storage.local.set({ inputHistory: JSON.stringify(history) });
  enableChat();
  addChatMessage(assistant, getText("cleanhistory"), true);
  return;
}

async function clear() {
  history = [];

  history.push({
    role: "assistant",
    content: getText("greeting"),
  });

  cLength = getConfigAndApply();

  // get the last button with class chatgeppetto-abort and chatgeppetto-copy
  const abortList = document.querySelectorAll(".chatgeppetto-abort");
  const copyList = document.querySelectorAll(".chatgeppetto-copy");
  const abort = abortList.item(abortList.length - 1);
  const copy = copyList.item(copyList.length - 1);
  copy.style.display = "block";
  abort.style.display = "none";

  // Save the updated history
  browser.storage.local.set({ hist: JSON.stringify(history) });

  rebuildChatMessages(history);

  enableChat();
  return;
}

//
// Function to print the known commands
//
async function helpCmd() {
  msg = getText("helpcmd");
  addChatMessage(assistant, markdownToHtml(msg), true);
  enableChat();
  return;
  //
  // Help command
  //
}

//
// Function to print the help message
//
async function help() {
  let msg = getText("help");
  addChatMessage(assistant, markdownToHtml(msg), true);
  enableChat();
  return;
}

//
// Function to pass the message to the LLM
//
async function notACommand() {
  let suggestionBox = document.getElementById("chatgeppetto-suggestionBox");
  suggestionBox.style.display = "none";
  await getResponse(history);
  browser.storage.local.set({ hist: JSON.stringify(history) });
}

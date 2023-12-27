async function executeCommand(message) {
  answer = "";
  //
  // Read webpage command
  //
  if (message.startsWith("http://") || message.startsWith("https://")) {
    getURL(message).then((response) => {
      enableChat();
    });
  } else if (
    message.endsWith("+i") ||
    message.startsWith("Cherche ") ||
    message.startsWith("cherche ") ||
    message.startsWith("Recherche ") ||
    message.startsWith("recherche ") || // french
    message.startsWith("Search ") ||
    message.startsWith("search ") ||
    message.startsWith("Find ") ||
    message.startsWith("find ") // english
  ) {
    searchTheWeb(message).then((response) => {
      enableChat();
    });
  } else if (message.startsWith(":readpagecontent")) {
    readPageContent().then((response) => {
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
    notACommand(message);
  }
}

async function getURL(message) {
  text = await getWebpage(message);
  removeLastHeader();
  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body"
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
  addChatMessage(assistant, getText("ok"));
  enableChat();
}

async function searchTheWeb(message) {
  removeLastHeader();
  removeLastMessage();
  if (message.endsWith("+i")) {
    text = message.replace("+i", "");
  } else {
    // remove the first word
    word = message.split(" ").slice(0);
    console.log("word: " + word);
    text = message.replace(word + " ", "");
  }
  history.push({
    role: "user",
    content: text,
  });
  addChatMessage(you, markdownToHtml(text));
  addChatMessage(assistant, getText("searching"));
  let searchQuery = await getSearchQuery(history).then((response) => {
    return response;
  });
  searchQuery = searchQuery.replace('"', "");
  console.log("Searching the web for: " + searchQuery);
  var searchUrl = searchEngine + "?q=";
  urlsearch = searchUrl + encodeURIComponent(searchQuery);
  let searchResults = await getSearchResults(urlsearch);
  getResponse(history).then((response) => {
    enableChat();
  });
  return;
}

async function readPageContent(message) {
  text = message.replace(":readpagecontent ", "");

  const listMessageBody = document.querySelectorAll(
    ".chatgeppetto-message-body"
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
  addChatMessage(assistant, getText("ok"));
  history.push({ role: "assistant", content: getText("ok") });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  enableChat();
  return;
}

async function hist() {
  removeLastHeader();
  console.log(history);
  enableChat();
  return;
}

async function deleteConfig() {
  removeLastHeader();
  await deleteConfigFromLocalStorage();
  enableChat();
  return;
}

async function deleteSuggestions() {
  removeLastHeader();
  deleteInputHistory();
  enableChat();
  return;
}

async function printConfig() {
  let config = getCurrentConfig();
  removeLastHeader();
  console.log(config);
  enableChat();
  return;
}

async function setValue(message) {
  removeLastHeader();
  setConfig(message);
  enableChat();
  return;
}

async function save(message) {
  // remove :save from message
  message = message.replace(":save ", "");
  //check if message is a valid string to use as a name for the saved config
  let exists = await conversationExists(message);
  if (exists) {
    addChatMessage(assistant, getText("alreadyExists"));
    enableChat();
    return;
  }
  if (message.match(/^[a-zA-Z0-9]+$/)) {
    removeLastHeader();
    saveConversation(message, history);
    await addChatMessage(assistant, getText("ok"));
  } else {
    addChatMessage(assistant, getText("invalidName"));
  }
  enableChat();
  return;
}

async function load(message) {
  message = message.replace(":load ", "");
  let exists = await conversationExists(message);
  if (exists) {
    removeLastHeader();
    history = await loadConversation(message);
    await addChatMessage(assistant, getText("ok"));
    browser.storage.local.set({ hist: JSON.stringify(history) });
    location.replace(location.href);
  } else {
    addChatMessage(assistant, getText("invalidName"));
  }
  enableChat();
}

async function deleteConv(message) {
  message = message.replace(":delete ", "");
  let exists = await conversationExists(message);
  if (exists) {
    removeLastHeader();
    await deleteConversation(message);
    await addChatMessage(assistant, getText("ok"));
  } else {
    addChatMessage(assistant, getText("invalidName"));
  }
  enableChat();
}

async function listConversations() {
  removeLastHeader();
  let list = await listSavedConversations();
  let convlist = getText("savedConversations") + "\n\n";
  for (let i = 0; i < list.length; i++) {
    convlist += i + 1 + ". " + list[i].key + "\n";
  }
  await addChatMessage(assistant, markdownToHtml(convlist));
  enableChat();
  return;
}

async function pop() {
  removeLastMessage();
  history.pop();
  browser.storage.local.set({ hist: JSON.stringify(history) });
  location.replace(location.href);
  enableChat();
  focusInput();
  return;
}

async function push(message) {
  removeLastMessage();
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
    addChatMessage(assistant, getText("invalidRole"));
    enableChat();
    return;
  }
}

async function clean() {
  removeLastHeader();
  history = await cleanHistory(history);
  browser.storage.local.set({ inputHistory: JSON.stringify(history) });
  enableChat();
  addChatMessage(assistant, getText("cleanhistory"));
  return;
}

async function clear() {
  history = [];
  browser.storage.local.set({ hist: JSON.stringify(history) });
  enableChat();
  clearChat();
  history.push({
    role: "system",
    content: getText("systemPrompt"),
  });
  history.push({
    role: "assistant",
    content: getText("greeting"),
  });
  browser.storage.local.set({ hist: JSON.stringify(history) });
  addChatMessage(assistant, markdownToHtml(getText("greeting")));
  enableChat();
  return;
  //
  // unknown command
  //
}

async function helpCmd() {
  msg = getText("helpcmd");
  addChatMessage(assistant, markdownToHtml(msg));
  enableChat();
  return;
  //
  // Help command
  //
}

async function help() {
  let msg = getText("help");
  addChatMessage(assistant, markdownToHtml(msg));
  enableChat();
  return;
}

async function notACommand() {
  let suggestionBox = document.getElementById("suggestionBox");
  suggestionBox.style.display = "none";
  await getResponse(history).then((response) => {
    enableChat();
  });
  content;
  browser.storage.local.set({ hist: JSON.stringify(history) });
}

//
// Function to set a config value
//
async function setConfig(message) {
  let config = await readConfigFromLocalStorage();

  if (message.startsWith(":set ")) {
    const value = message.split(":set ")[1];
    const key = value.split(" ")[0];
    const updatedValue = message.replace(":set " + key + " ", "");

    // Check if key is an existing key in config
    if (key === "help") {
      addChatMessage(assistant, markdownToHtml(getText("helpset")));
      return;
    }

    if (config.hasOwnProperty(key)) {
      config[key] = updatedValue;
      await saveConfig(config);
      applyConfig(config);
      addChatMessage(assistant, "Config updated", true);
    } else {
      addChatMessage(assistant, `Config key ${key} not found`, true);
    }
  }
}

//
// Function to reaload the config
//
async function applyConfig(config) {
  if (config) {
    searchEngine = config.searchEngine;
    GEPPETTO_API_KEY = config.apikey;
    GEPPETTO_API_ENDPOINT = config.api;
    language = config.language;
    template = config.template;
    character = config.character + "-" + config.language;
    assistant = config.assistant;
    you = config.you;
  }
}

//
// Function to read the current config from local storage
//
async function readConfigFromLocalStorage() {
  try {
    const result = await browser.storage.local.get("config");
    if (result.config) {
      return result.config;
    } else {
      const defaultConfig = {
        searchEngine: "Enter your search engine url here",
        apikey: "Enter your API key here",
        api: "Enter your API endpoint here",
        language: "en",
        template: "Enter your instruction template here",
        character: "Enter your TextGen character here",
        assistant: assistant,
        you: "You",
      };
      await saveConfig(defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error("Error reading configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

//
// Function to save the config to local storage
//
async function saveConfig(config) {
  try {
    await browser.storage.local.set({ config });
  } catch (error) {
    console.error("Error saving configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

//
// Function to get the current config
//
async function getCurrentConfig() {
  try {
    const result = await browser.storage.local.get("config");
    return result.config || null;
  } catch (error) {
    console.error("Error getting current configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

//
// Function to delete the current config
//
async function deleteConfigFromLocalStorage() {
  try {
    await browser.storage.local.remove("config");
  } catch (error) {
    console.error("Error deleting configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

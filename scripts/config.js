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
      console.log(`Setting config: ${key} => ${updatedValue}`);
      config[key] = updatedValue;
      await saveConfig(config);
      applyConfig(config);
      addChatMessage(assistant, "Config updated");
    } else {
      addChatMessage(assistant, `Config key ${key} not found`);
    }
  }
}

async function applyConfig(config) {
  console.log("Applying config");
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

async function readConfigFromLocalStorage() {
  console.log("Reading config from local storage");

  try {
    const result = await browser.storage.local.get("config");

    if (result.config) {
      return result.config;
    } else {
      console.log("Config not found in local storage");
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

async function saveConfig(config) {
  console.log("Saving config");
  try {
    await browser.storage.local.set({ config });
  } catch (error) {
    console.error("Error saving configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

async function getCurrentConfig() {
  try {
    const result = await browser.storage.local.get("config");
    return result.config || null;
  } catch (error) {
    console.error("Error getting current configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

async function deleteConfigFromLocalStorage() {
  console.log("Deleting config from local storage");

  try {
    await browser.storage.local.remove("config");
    console.log("Config deleted successfully");
  } catch (error) {
    console.error("Error deleting configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

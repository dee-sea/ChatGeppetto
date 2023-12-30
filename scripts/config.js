//
// Function to set a config value
//
async function setConfig(message) {
  // Read the current config from local storage
  let config = await readConfigFromLocalStorage();

  if (message.startsWith(":set ")) {
    const value = message.split(":set ")[1];
    const key = value.split(" ")[0];
    const updatedValue = message.replace(":set " + key + " ", "");

    // Check if key is a valid config key
    if (key === "help") {
      // Display help message for setting config values
      addChatMessage(assistant, markdownToHtml(getText("helpset")));
      return;
    }

    // Update config if the key exists, otherwise display an error message
    if (config.hasOwnProperty(key)) {
      config[key] = updatedValue;
      await saveConfig(config);
      // Apply the updated config
      applyConfig(config);
      addChatMessage(assistant, "Config updated", true);
    } else {
      addChatMessage(assistant, `Config key ${key} not found`, true);
    }
  }
}

//
// Function to reload the config
//
async function applyConfig(config) {
  // Apply the configuration values to global variables
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
    // Attempt to read the config from local storage
    const result = await browser.storage.local.get("config");

    if (result.config) {
      // Return the existing config if it exists
      return result.config;
    } else {
      // Create a default config if none exists and save it
      const defaultConfig = {
        searchEngine: "https://searx.thele.me/",
        apikey: "Enter your API key here",
        api: "https://api.openai.com/v1/chat/completions",
        language: "en",
        template: "Mistral",
        character: "ChatGeppetto",
        assistant: assistant,
        you: "You",
      };
      await saveConfig(defaultConfig);
      msg = markdownToHtml(
        "It seems you did not have a configuration already set.\n\nA default configuration pointing to OpenAI has been created for you, with the following values:\n\n" +
          "API endpoint: " +
          defaultConfig.api +
          "\n" +
          "Language: " +
          defaultConfig.language +
          "\n" +
          "Search engine: " +
          defaultConfig.searchEngine +
          "\n" +
          "Template: " +
          defaultConfig.template +
          "\n" +
          "Character: " +
          defaultConfig.character +
          "\n" +
          "Assistant: " +
          defaultConfig.assistant +
          "\n" +
          "You: " +
          defaultConfig.you +
          "\n\n" +
          "If you plan to use the OpenAI API, you will need to enter your API key in the configuration with:\n" +
          "`:set apikey <your API key>` and you are ready to go\n\n" +
          "If you plan to use a local TextGen model, you will need to enter the API endpoint and key in the configuration with:\n" +
          "`:set api <your API endpoint>` and\n" +
          "`:set apikey <your API key>`\n\n" +
          "Feel free to change the other values to your liking.\n\n",
      );
      addChatMessage(assistant, msg, true);
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
    // Save the config to local storage
    await browser.storage.local.set({ config });
  } catch (error) {
    console.error("Error saving configuration:", error);
    throw error;
  }
}

//
// Function to get the current config
//
async function getCurrentConfig() {
  try {
    // Retrieve the current config from local storage
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
    // Remove the config from local storage
    await browser.storage.local.remove("config");
  } catch (error) {
    console.error("Error deleting configuration:", error);
    throw error; // Propagate the error to the caller
  }
}

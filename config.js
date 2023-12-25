// Config file for ChatGeppetto
// Actual config:
// searchEngine: "https://searx.thele.me/"
// GEPPETTO_API_KEY: "sk-Skynet-openchatKEY"
// GEPPETTO_API_ENDPOINT: "https://chatapi.thele.me/v1/chat/completions"
// language: "fr"
// assistant_name: "ChatGeppetto"
// your_name: "You"

async function setConfig(message) {
  let config = await readConfigFromLocalStorage();
  if (message.startsWith(":set ")) {
    value = message.split(":set ")[1];
    key = value.split(" ")[0];
    value = message.replace(":set " + key + " ", "");
    // chack if key is an existing key in config
    if (key == "help") {
      addChatMessage(assistant, markdownToHtml(getText("helpset")));
      return;
    }
    if (config[key]) {
      console.log("Setting config :" + key + " => " + value);
      config[key] = value;
      browser.storage.local.set({ config: config }).then((res) => {
        applyConfig();
        addChatMessage(assistant, "Config updated");
      });
    } else {
      addChatMessage(assistant, "Config key " + key + " not found");
    }
  }
}

function applyConfig(config) {
  console.log("Applying config");
  if (config) {
    searchEngine = config.searchEngine;
    GEPPETTO_API_KEY = config.apikey;
    GEPPETTO_API_ENDPOINT = config.api;
    language = config.language;
    template: config.template;
    character: config.character;
    assistant = config.assistant;
    you = config.you;
    browser.storage.local.set({ config: config });
  } else {
    readConfigFromLocalStorage();
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
      var config = {
        searchEngine: "Enter your search engine url here",
        apikey: "Enter your API key here",
        api: "Enter your API endpoint here",
        language: "en",
        template: "Enter your instruction template here",
        character: "Enter your TextGen character here",
        assistant: assistant,
        you: "You",
      };
      browser.storage.local.set({ config: config });
    }
  } catch (error) {
    console.error("Error reading configuration:", error);
    throw error; // Propagate the error to the caller
  }
  return config;
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

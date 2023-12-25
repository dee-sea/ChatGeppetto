config = {
  searchEngine: "https://searx.thele.me/",
  GEPPETTO_API_KEY: "sk-Skynet-openchatKEY",
  GEPPETTO_API_ENDPOINT: "https://chatapi.thele.me/v1/chat/completions",
  language: "fr",
  assistant_name: "ChatGeppetto",
  your_name: "You",
};

function setConfig(message) {
  if (userInput.startsWith("/set ")) {
    value = userInput.split("/set ")[1];
    key = value.split(" ")[0];
    value = userInput.replace("/set " + key + " ", "");
    config[key] = value;
  }
}

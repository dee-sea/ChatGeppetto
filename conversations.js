// Function to save the conversation to local storage
async function saveConversation(conversationKey, conversation) {
  try {
    await browser.storage.local.set({ [conversationKey]: conversation });
    console.log("Conversation saved successfully.");
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}

// Function to load the conversation from local storage
async function loadConversation(conversationKey) {
  try {
    const result = await browser.storage.local.get(conversationKey);
    const serializedConversation = result[conversationKey];

    if (!serializedConversation) {
      console.log("No conversation found in local storage.");
      return null;
    }

    console.log("Conversation loaded successfully.");
    return serializedConversation;
  } catch (error) {
    console.error("Error loading conversation:", error);
    return null;
  }
}

// Function to list all saved conversations in local storage
async function listSavedConversations() {
  try {
    const result = await browser.storage.local.get(null);
    const conversations = Object.entries(result).map(([key, value]) => ({
      key,
      conversation: value,
    }));
    return conversations;
  } catch (error) {
    console.error("Error listing saved conversations:", error);
    return [];
  }
}

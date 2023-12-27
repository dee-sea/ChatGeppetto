// Function to save the conversation to local storage
async function saveConversation(conversationKey, conversation) {
  try {
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    conversations.push({ key: conversationKey, conversation });
    await browser.storage.local.set({ conversations });
  } catch (error) {
    handleStorageError("Error saving conversation", error);
  }
}

// Function to load the conversation from local storage
async function loadConversation(conversationKey) {
  try {
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    const foundConversation = conversations.find(
      (entry) => entry.key === conversationKey
    );
    if (!foundConversation) {
      return null;
    }
    return foundConversation.conversation;
  } catch (error) {
    handleStorageError("Error loading conversation", error);
    return null;
  }
}

// Function to list all saved conversations in local storage
async function listSavedConversations() {
  try {
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    return conversations;
  } catch (error) {
    handleStorageError("Error listing saved conversations", error);
    return [];
  }
}

// Function to delete a conversation from local storage
async function deleteConversation(conversationKey) {
  try {
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    let conversations = storedConversations.conversations || [];
    // Remove the conversation with the specified key
    conversations = conversations.filter(
      (entry) => entry.key !== conversationKey
    );
    // Save the updated conversations array
    await browser.storage.local.set({ conversations });
  } catch (error) {
    handleStorageError("Error deleting conversation", error);
  }
}

// Function to check if a conversation with a given key exists
async function conversationExists(conversationKey) {
  try {
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];

    return conversations.some((entry) => entry.key === conversationKey);
  } catch (error) {
    handleStorageError("Error checking if conversation exists", error);
    return false;
  }
}

// Centralized error handling function
function handleStorageError(message, error) {
  console.error(`${message}:`, error);
}

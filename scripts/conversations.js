//
// Function to save the conversation to local storage
//
async function saveConversation(conversationKey, conversation) {
  try {
    // Retrieve existing conversations from local storage
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    
    // Add the new conversation to the array and update local storage
    conversations.push({ key: conversationKey, conversation });
    await browser.storage.local.set({ conversations });
  } catch (error) {
    // Handle errors related to saving conversations
    handleStorageError("Error saving conversation", error);
  }
}

//
// Function to load the conversation from local storage
//
async function loadConversation(conversationKey) {
  try {
    // Retrieve existing conversations from local storage
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    
    // Find and return the conversation with the specified key
    const foundConversation = conversations.find(
      (entry) => entry.key === conversationKey
    );
    
    if (!foundConversation) {
      return null;
    }
    
    return foundConversation.conversation;
  } catch (error) {
    // Handle errors related to loading conversations
    handleStorageError("Error loading conversation", error);
    return null;
  }
}

//
// Function to list all saved conversations in local storage
//
async function listSavedConversations() {
  try {
    // Retrieve existing conversations from local storage
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    
    return conversations;
  } catch (error) {
    // Handle errors related to listing conversations
    handleStorageError("Error listing saved conversations", error);
    return [];
  }
}

//
// Function to delete a conversation from local storage
//
async function deleteConversation(conversationKey) {
  try {
    // Retrieve existing conversations from local storage
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
    // Handle errors related to deleting conversations
    handleStorageError("Error deleting conversation", error);
  }
}

//
// Function to check if a conversation with a given key exists
//
async function conversationExists(conversationKey) {
  try {
    // Retrieve existing conversations from local storage
    const storedConversations = await browser.storage.local.get(
      "conversations"
    );
    const conversations = storedConversations.conversations || [];
    
    // Check if any conversation has the specified key
    return conversations.some((entry) => entry.key === conversationKey);
  } catch (error) {
    // Handle errors related to checking if a conversation exists
    handleStorageError("Error checking if conversation exists", error);
    return false;
  }
}

//
// Centralized error handling function
//
function handleStorageError(message, error) {
  // Log storage-related errors
  console.error(`${message}:`, error);
}


// Background script for the Firefox plugin
// Create a context menu item for reading page content
browser.contextMenus.create({
  id: "ReadPage",
  title: "Send page to ChatGeppetto",
});

browser.contextMenus.create({
  id: "ReadSel",
  title: "Send selection to ChatGeppetto",
  contexts: ["selection"],
});

// Function to handle context menu item clicks
browser.contextMenus.onClicked.addListener(function (info, tab) {
  // Check if the clicked menu item is "ReadPage"
  if (info.menuItemId == "ReadPage") {
    // Execute JavaScript file in the active tab
    browser.tabs.executeScript({
      file: "menu-scripts/readpage.js",
    });

    // NOTE: If additional logic is added in the future, explain it here
  } else if (info.menuItemId == "ReadSel") {
    // Execute JavaScript file in the active tab
    browser.tabs.executeScript({
      file: "menu-scripts/readsel.js",
    });
  }
});

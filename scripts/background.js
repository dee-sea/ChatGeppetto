// Background script for the Firefox plugin

// Create a context menu item for reading page content
browser.contextMenus.create({
  id: "ReadPage",
  title: "Read Page Content",
});

// Function to handle context menu item clicks
browser.contextMenus.onClicked.addListener(function (info, tab) {
  // Check if the clicked menu item is "ReadPage"
  if (info.menuItemId == "ReadPage") {
    // Inject CSS file into the active tab
    browser.tabs.insertCSS({ file: "style.css" });

    // Execute JavaScript file in the active tab
    browser.tabs.executeScript({
      file: "menu-scripts/readpage.js",
    });

    // NOTE: If additional logic is added in the future, explain it here
  }
});

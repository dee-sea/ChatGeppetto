browser.contextMenus.create({
  id: "ReadPage",
  title: "Read Page Content",
});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == "ReadPage") {
    browser.tabs.insertCSS({ file: "style.css" });
    browser.tabs.executeScript({
      file: "readpage.js",
    });
  }
});

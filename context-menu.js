browser.contextMenus.create({
  id: "ReadPage",
  title: "Read Page Content",
});

//browser.contextMenus.create({
//  id: "ReadLink",
//  title: "Read linked page",
//  contexts: ["link"],
//});

browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId == "ReadPage") {
    browser.tabs.insertCSS({ file: "style.css" });
    browser.tabs.executeScript({
      file: "readpage.js",
    });
  } else if (info.menuItemId == "ReadLink") {
    browser.tabs.sendMessage(tabs[0].id, {
      command: "read-it",
      readURL: info.linkUrl,
    });
  }
});

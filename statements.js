const statements = {
  readText: {
    fr: "Lis attentivement et souviens toi du texte suivant:",
    en: "Read carefully and remember the following text:",
  },
  longSeparator: {
    fr: "\n\n----------\n\n",
    en: "\n\n----------\n\n",
  },
  shortSeparator: {
    fr: "\n\n-----\n\n",
    en: "\n\n-----\n\n",
  },
  selectedText: {
    fr: "*Texte sélectionné*",
    en: "*Selected text*",
  },
  searching: {
    fr: "*Recherche en cours...*",
    en: "*Searching the web...*",
  },
  greeting: {
    fr: "Salut, je suis ChatGeppetto.\nComment puis-je t'aider aujourd'hui ?",
    en: "Hi, I'm ChatGeppetto.\nHow can I help you today?",
  },
  helpcmd: {
    fr: "Désolé, je ne comprends pas cette commande. Les commandes que je comprends sont:\n\n| Commande | Description |\n| --- | --- |\n| **:clear** | efface l'historique de la conversation |\n| **:hist** | affiche l'historique de la conversation dans la console Javascript (Debug) |\n| **help** | affiche cette aide\n| **:set | set a configuration parametter. \":set help\" for help |\n| **:set** | set a configuration parametter. \":set help\" for help |\n\n |Comment puis-je t'aider aujourd'hui ?",
    en: 'Sorry, I don\'t understand this command. The commands I understand are:\n\n| Command | Description |\n| --- | --- |\n| **:clear** | clears the conversation history |\n| **:hist** | displays the conversation history in the Javascript console (Debug) |\n| **help** | displays this help\n| **:set | set a configuration parametter. ":set help" for help |\n| **:set** | set a configuration parametter. ":set help" for help |\n\n |How can I help you today?',
  },
  helpset: {
    fr: "Les paramettres de configuration sont:\n\n| Paramettre | Description |\n| --- | --- |\n| **language** | change la langue par défaut du bot |\n| **api** | change l'api de TextGen |\n| **apikey** | change la clé d'api de TextGen |\n| **template** | change la template TextGen à utiliser pour les générations|\n| **character** | change le personnage TextGen à utiliser pour les générations|\n| **searchEngine** | change l'instance searx à utiliser pour les recherches|\n| **assisstant** | change le nom du bot |\n| **you** | change le nom de l'utilisateur |\n\n",
    en: "The configuration parametters are:\n\n| Parametter | Description |\n| --- | --- |\n| **language** | change the bot's default language |\n| **api** | change the TextGen api |\n| **apikey** | change the TextGen api key |\n| **template** | change the TextGen template to use for generations|\n| **character** | change the TextGen character to use for generations|\n| **searchEngine** | change the searx instance to use for searches|\n| **assisstant** | change the bot's name |\n| **you** | change the user's name |\n\n",
  },
  help: {
    fr: "Salut, je suis ChatGeppetto. Je peux répondre à tes questions.\n\nSi tu veux simplement discuter, il te suffit de taper ta question ou ta demande et d'appuyer sur entrée.\n\nTu peux aussi me demander de faire une recherche sur le web avant de répondre en ajoutant '+i' à la fin de ta phrase, ça prendra plus longtemps, mais j'aurais plus d'informations et plus récentes.\n\nN'hésite pas à selectionner du texte sur une page web et le faire glisser dans le champs d'entrée de texte pour que je le lise et on poura en discuter.\n\nEt l'entrée 'Read Page Content' du menu contextuel sert à me demander de lire la page courante pour qu'on puisse en discuter.\n\nSi tu veux que je lise une autre page web, tape juste l'url en commençant par http:// ou https:// ou Drag&Drop un lien dans le champs d'entrée de texte.\n\nfinalement tu peux envoyer des commandes en commençant ton entrée par :. Les commandes que je comprends sont:\n\n| Commande | Description |\n| --- | --- |\n| **:clear** | efface l'historique de la conversation |\n| **:hist** | affiche l'historique de la conversation dans la console Javascript (Debug) |\n| **help** | affiche cette aide\n\n |Comment puis-je t'aider aujourd'hui ?",
    en: "Hi, I'm ChatGeppetto. I can answer your questions.\n\nIf you just want to chat, just type your question or request and press enter.\n\nYou can also ask me to do a web search before answering by adding '+i' at the end of your sentence, it will take longer, but I will have more information and more recent.\n\nFeel free to select text on a web page and drag it into the text input field for me to read and we can discuss it.\n\nAnd the 'Read Page Content' entry in the context menu is used to ask me to read the current page so we can discuss it.\n\nIf you want me to read another web page, just type the url starting with http:// or https:// or Drag&Drop a link into the text input field.\n\nfinally you can send commands by starting your input with :. The commands I understand are:\n\n| Command | Description |\n| --- | --- |\n| **:clear** | clears the conversation history |\n| **:hist** | displays the conversation history in the Javascript console (Debug) |\n| **help** | displays this help\n\n |How can I help you today?",
  },
  loadError: {
    fr: "Désolé, je n'ai pas pu charger la page demandée.",
    en: "Sorry, I couldn't load the requested page.",
  },
  keywords: {
    fr: "Ne réponds pas à la question, donne juste des mots clés à chercher sur Google pour trouver la réponse. Soit facuel, ajoute aucun text. Donne juste une liste de mots clés.",
    en: "Do not answer the question, just gives keywords to search on Google to find the answer. Be factual, add no text. Just give a list of keywords.",
  },
  resultPages: {
    fr: "Voici une liste de pages avec leurs urls et le texte pour t'aider à répondre:\n\n",
    en: "Here is a list of pages with their urls and text to help you answer:\n\n",
  },
  reading: {
    fr: "*Lecture de la page ",
    en: "*Reading page ",
  },
  remember: {
    fr: "Lis et souviens toi bien de ces pages web, tu seras interrogé dessus plus tard.",
    en: "Read and remember these web pages well, you will be questioned about them later.",
  },
  ok: {
    fr: "J'ai terminé",
    en: "I'm done",
  },
};

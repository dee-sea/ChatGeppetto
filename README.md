# What's ChatGeppetto?

Basically, ChatGeppetto is a Firefox extension that allows you to chat with a LLM hosted on a OobaBooga TextGen interface in api mode. 

The initial idea was taken from Felipe Oliveria's [OpenAI-Chatbot](https://github.com/felipeOliveira-1/openai-chatbot) a nice and simple widget wrotten in HTML, CSS and Javascript. It inspired me to make a chatbot widget for my SearxNG instance. I wanted to be able to chat with a bot and make him help me in web searches. Then I tought that it would be great if it was ont only on the search engine, but on all the web. So I switched to a Firefox extention.

# Features

- Sidebar panel to chat with the bot.
- Open and close the panel with a keyboard shortcut.
- Feed text selection and pages to the bot memory.
- Internet aware bot. The bot can make searches on the internet before answering you.
- Bot configuration with special commands.

# What do I need to run ChatGeppetto?

You need to have several things to be able to use all chatgeppetto features:
a
1. You need an instance of [Oobabooga Text Genaration](https://github.com/oobabooga/text-generation-webui) running with the api mode enabled.
2. To make ChatGeppetto internet aware, you need to use a SearxNG [searxng](https://github.com/searxng/searxng) instance.
3. You need to use a Firefox browser with the ChatGeppetto extension installed.

# How do I install ChatGeppetto?

If the extension is not in the store. You need to install it manually.

1. You need to clone this repository.
2. cd into the cloned repository.
3. Run `web-ext build` to build the extension. (Instructions to install web-ext can be found [here](https://www.npmjs.com/package/web-ext))
4. Go to `about:addons` in Firefox.
5. Click on the gear icon and select `Install Add-on From File...`.
6. if you don't have the "Install Add-on From File..." option, you need to set the `xpinstall.signatures.required` option to false.
7. Select the `chatgeppetto-1.0.0.zip` file in the `web-ext-artifacts` directory.
8. You're done!

# How do I use ChatGeppetto?

## Add-On configuration (First time only or when you want to change the configuration)

1. Once the extension is installed, type CTRL+y to open the ChatGeppetto panel.
2. To configure the API endpoint, type /set api <api_endpoint>.
3. To configure your API key, type /set apikey <api_key>.
4. You also need to configure the TextGen prompt template. Type /set template <prompt_template>.
5. And the character to use to generate answers. Type /set character <character_name>.
6. To configure the searx endpoint, type /set searchEngine <searx_endpoint>.
7. Optionally, you can configure the default language for the bot. Type /set language <language_code>. (Only `en` and `fr` available for now)
8. You can change the name of the bot by typing /set assistant <bot_name>.
9. And your name by typing /set you <your_name>.

## Chatting with the bot

To chat with the bot, you simply need to type your message in the input field and press enter. The bot will answer you in the chat window. 

If you want ChatGeppetto to make a search on the internet before answering you, you need to finish your prompt with `+i`. The answer will take more time to generate, but it will be more relevant and use recent data.

You can select text on a page and Drag and Drop it in the input field. The text will be fed to the bot memory and will be used to generate subsequent answers.

The add-on adds a "Read Page Content" entry in the context menu. If you select this entry, the add-on will read the content of the current page and feed it to the bot memory. The bot will use this information to generate subsequent answers.

If you want to get ChatGeppetto to read other pages, simply tyle a URL in the input field and press enter or darg and drop a link on the field. The bot memory will be fed with the content od those pages.

Pay attention feeding too much data to the bot memory. It can lead to unexpected results specially with Model with a short context. Mixtral 8x7b works wonders with a large context and is recommended. As a rule of thumb, the longer the context, the slower the generation.

Finally you can use special commands starting with a colon `:` to interact with the bot. Yes, I'm a huge Vim fanboy and I use [Surfingkeys](https://github.com/brookhong/Surfingkeys) in my browser ;-). The availlable commands can be listed by just saying `help` to the bot. 

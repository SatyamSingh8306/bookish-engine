# AI Chatbot Integration Widget

A lightweight, plug-and-play JavaScript widget that allows any website to embed an AI-powered chat assistant using a simple `<script>` tag.  
Designed to be fast, customizable, and easy to integrate into any HTML page.

---

## 🚀 Features

- ✅ Simple integration using one script tag  
- ✅ No frameworks required — pure JavaScript  
- ✅ Auto-render chat bubble + chat window  
- ✅ Connects to any backend AI API (RAG, LLM, custom endpoints)  
- ✅ Custom user & client identification through `data-*` attributes  
- ✅ Works on GitHub Pages, jsDelivr CDN, or any static hosting  

---

## 📦 Installation / Integration

Add the following code to **any website**, ideally at the bottom of the `<body>` tag:
***This is for testing purpose only and don't use it for production***

**make sure to change data-user string for new conversation data-user="random-conversation-id"**
```html
<script 
    src="https://satyamsingh8306.github.io/bookish-engine/public/widget.js?v=1"
    data-user="USER199"
    data-client="satyam"
    data-api="https://bookish-engine-oe9s.onrender.com"
    async>
</script>
````

***To test on local Server***

```json
<script src="http://localhost:3000/public/winget4.js" data-user="USER12" data-client="satyam"
        data-api="http://localhost:8000" async>
</script>
```

### ✅ Parameters (data-attributes)

| Attribute     | Description                                      |
| ------------- | ------------------------------------------------ |
| `data-user`   | Website user ID (optional)                       |
| `data-client` | Your client/project name (optional)              |
| `data-api`    | API endpoint where the backend receives messages |

---

## 📁 Project Structure

```
ai-chatbot-integration/
│
├── public/
│   ├── widget.js        # Main JS widget file served on the client site
│
├── index.html           # Example test page for integration
├── README.md
└── .gitlab-ci.yml       # GitLab Pages deployment config
```

---

## 🧠 How It Works

1. Website loads `widget.js`
2. The script:

   * Creates a floating chat bubble
   * Opens a chat box when clicked
   * Sends messages to your backend API via `fetch`
   * Displays AI responses
3. Everything runs client-side — no frameworks needed.

---

## 🔧 Customization

You can modify:

* Chat bubble color
* Chat window UI
* Animations
* API request style
* Message layout

Just edit `public/widget.js` and re-deploy.

---

## 🌐 Deploying the Widget (GitHub Pages)

Make sure your widget is accessible from:

```
https://<username>.github.io/<repo>/public/widget.js
```

If you update the file, force refresh using:

```
...?v=2
```

Example:

```html
<script src="https://satyamsingh8306.github.io/bookish-engine/public/widget.js?v=3"></script>
```

---

## 🧪 Local Testing

Open the example page:

```
index.html
```

You can test widget UI + API response using your local backend.

---

## 📤 Backend Requirements

Your API must accept JSON requests:

```json
{
  "message": "Hello AI",
  "user": "USER123",
  "client": "Satyam"
}
```

And return:

```json
{
  "reply": "Hello! How can I help you today?"
}
```

You can build this using:

* Node.js / Express
* Python FastAPI / Flask
* Go / Java / PHP
* Or any REST backend

---

## 🤝 Contributing

Pull requests are welcome!
If you'd like to improve UI, animations, or performance — feel free to contribute.

---

## 📄 License

This project is open-source under the **MIT License**.

---

## 📌 Project Status
- ✅Active
- ✅ Fully working
- ✅ Suitable for integration into real websites

---
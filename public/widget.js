(function () {
  class AIChatWidget {
    constructor({ userId, clientId, apiUrl }) {
      this.userId = userId;
      this.clientId = clientId;
      this.apiUrl = apiUrl;
      this.init();
    }

    init() {
      this.injectStyles();
      this.injectUI();
      this.addEvents();
    }

    injectStyles() {
      const css = `
      #ai-chat-btn {
        position: fixed; bottom: 20px; right: 20px;
        background: #4f46e5; color: white; border-radius: 50%;
        width: 55px; height: 55px; font-size: 25px;
        border: none; cursor: pointer; z-index: 9999;
      }
      #ai-chat-box {
        display:none; position: fixed; bottom: 90px; right: 20px;
        width: 320px; height: 420px; background: white;
        border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 12px; z-index: 9999;
        font-family: sans-serif;
        display: flex; flex-direction: column;
      }
      #ai-chat-messages {
        flex:1; overflow-y:auto; padding: 5px; font-size: 14px;
      }
      .ai-msg { background:#f3f4f6; padding:8px; border-radius:8px; margin:4px 0; }
      .ai-user { background:#dbeafe; text-align:right; }
      #ai-chat-input { display:flex; gap:6px; margin-top:5px; }
      #ai-chat-input input {
        flex:1; padding:8px; border-radius:6px; border:1px solid #ccc;
      }
      #ai-chat-input button {
        padding:8px 14px; background:#4f46e5; color:white;
        border:none; border-radius:6px; cursor:pointer;
      }
      `;
      const style = document.createElement("style");
      style.innerHTML = css;
      document.head.appendChild(style);
    }

    injectUI() {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
        <button id="ai-chat-btn">💬</button>
        <div id="ai-chat-box">
          <div id="ai-chat-messages"></div>
          <div id="ai-chat-input">
            <input id="ai-input" placeholder="Ask something..."/>
            <button id="ai-send">→</button>
          </div>
        </div>`
      );
    }

    addEvents() {
      document.getElementById("ai-chat-btn").onclick = () => {
        const box = document.getElementById("ai-chat-box");
        box.style.display = box.style.display === "none" ? "block" : "none";
      };

      document.getElementById("ai-send").onclick = () => this.sendMessage();
      document.getElementById("ai-input").onkeypress = (e) => {
        if (e.key === "Enter") this.sendMessage();
      };
    }

    appendMessage(text, sender = "bot") {
      const msgBox = document.getElementById("ai-chat-messages");
      const div = document.createElement("div");
      div.className = `ai-msg ${sender === "user" ? "ai-user" : ""}`;
      div.textContent = text;
      msgBox.appendChild(div);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    async sendMessage() {
      const input = document.getElementById("ai-input");
      const text = input.value.trim();
      if (!text) return;

      this.appendMessage(text, "user");
      input.value = "...";

      try {
        const res = await fetch(`${this.apiUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userid: this.userId,
            clientid: this.clientId,
            query: text
          }),
        });

        const data = await res.json();
        this.appendMessage(data.reply || "Invalid response", "bot");

      } catch (err) {
        this.appendMessage("Network Error", "bot");
      }

      input.value = "";
    }
  }

  // Auto-bootstrap widget when the script loads
  const script = document.currentScript;
  const userId = script.getAttribute("data-user");
  const clientId = script.getAttribute("data-client");
  const apiUrl = script.getAttribute("data-api");

  if (userId && clientId && apiUrl) {
    new AIChatWidget({ userId, clientId, apiUrl });
  }

  window.AIChatWidget = AIChatWidget; // optional manual init
})();

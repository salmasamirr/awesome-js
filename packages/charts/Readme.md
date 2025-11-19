
# README — Running the Local LLM with LM Studio & Connecting to Angular

 Overview

This project uses a **local LLM (Meta-Llama-3.1-8B-Instruct-GGUF)** running through **LM Studio**.
The Angular application communicates with the model locally through an OpenAI-compatible API endpoint.

---

# 1. Install LM Studio

Download LM Studio from:
[https://lmstudio.ai/](https://lmstudio.ai/)

Install it and open the app.

---

# 2. Download the Model

1. Open LM Studio
2. Go to **Models**
3. Search for:
   **Meta-Llama-3.1-8B-Instruct-GGUF**
4. Choose a quantization like:
   `Q4_K_M` (recommended)
5. Click **Download**

---

# 3. Load the Model

After download:

1. Go to the **Local Models** tab
2. Select the model:
   `meta-llama-3.1-8b-instruct`
3. Click **Load Model**

Wait until the status becomes:

```
READY
```

---

# 4. Start the Local API Server

To allow Angular to communicate with LM Studio:

1. Go to the **Server** tab (on the left sidebar)
2. Enable the toggle button **Start Server**
3. It must show:

```
Status: Running
Listening on http://localhost:1234
```

This means your local LLM API is active.

---

# 5. Supported Endpoints

LM Studio exposes a local OpenAI-compatible server:

```
POST /v1/chat/completions
POST /v1/completions
POST /v1/responses
GET  /v1/models
```

The Angular project uses:

```
http://localhost:1234/v1/chat/completions
```

---

# 6. Angular Configuration

Inside your Angular project, the LLM service uses:

```ts
private readonly apiUrl = 'http://localhost:1234/v1/chat/completions';
```

And the body must include the exact model name:

```ts
model: "meta-llama-3.1-8b-instruct"
```

Example request:

```ts
const body = {
  model: "meta-llama-3.1-8b-instruct",
  messages: [
    { role: "system", content: "You are an ECharts expert." },
    { role: "user", content: "Create a bar chart for monthly sales." }
  ]
};
```

---

# 7. Test the LLM API

Before running Angular, verify the server works:

Open in browser:

```
http://localhost:1234/v1/models
```

If you see JSON response → everything works.

Or use Postman:

POST → `http://localhost:1234/v1/chat/completions`
Body:

```json
{
  "model": "meta-llama-3.1-8b-instruct",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

You should receive a reply from the model.

---

#  8. Run the Angular Project

Now simply run:

```bash
ng serve -o
```

The app will automatically send requests to the local LLM running on:

```
http://localhost:1234
```

---

# Important Notes

* LM Studio **must always be running**
* The model must be **loaded**
* The server must show **Status: Running**
* If LM Studio is closed → Angular will show connection errors
* This project requires **no internet** once the model is downloaded

---

# Done!

Your Angular project is now fully connected to the local LLM through LM Studio.

---

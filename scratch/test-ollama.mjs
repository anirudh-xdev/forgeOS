const res = await fetch("http://localhost:11434/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "qwen2.5-coder:14b",
    messages: [{ role: "user", content: 'Return valid JSON with key "greeting" set to "hello world"' }],
    stream: false,
    format: "json",
  }),
});
const data = await res.json();
console.log("Ollama Response:", JSON.stringify(data, null, 2));

import time
from flask import jsonify
from ai.model_manager import model_manager
from ai import memory
from mode_config import get_config

# Simple rate limiter: { username: [timestamp, timestamp, ...] }
# Limit: 10 requests per minute
RATE_LIMIT = 10
RATE_WINDOW = 60
request_history = {}

def check_rate_limit(username):
    now = time.time()
    if username not in request_history:
        request_history[username] = []
    
    # Clean up old requests
    request_history[username] = [t for t in request_history[username] if now - t < RATE_WINDOW]
    
    if len(request_history[username]) >= RATE_LIMIT:
        return False
    
    request_history[username].append(now)
    return True


# Valid models for get_available_models
VALID_MODELS = [
    "gemma:2b", 
    "gemma:7b", 
    "llama3.2:1b", 
    "mistral",
    "qwen:0.5b",
    "qwen:1.8b",
    "qwen:4b", 
    "lfm2.5-thinking",
    "gemma3:1b",
    "gemma3:270m"
]

# Response Cache: { hash(json_dump(messages + model)): response_content }
# Size limit: 100 items
RESPONSE_CACHE = {}

def get_cache_key(model, messages, system_prompt):
    import json
    # specific enough to be unique, generic enough to be hit
    key_data = {
        "model": model,
        "messages": messages,
        "sys": system_prompt
    }
    return json.dumps(key_data, sort_keys=True)

def handle_chat_request(data, username):
    if not username:
        return jsonify({"success": False, "error": "Authentication required"}), 401
        
    if not check_rate_limit(username):
        return jsonify({"success": False, "error": "Rate limit exceeded. Please wait."}), 429

    message = data.get("message")
    messages = data.get("messages", [])
    
    # Support both single message and full history (preferred)
    if not messages and message:
        messages = [{"role": "user", "content": message}]
        
    if not messages:
        return jsonify({"success": False, "error": "No message provided"}), 400

    persona_key = data.get("persona", "diszi")
    mode_key = data.get("mode", "default")
    
    # Get configuration from mode_config
    config = get_config(persona_key, mode_key)
    
    # Use model from request if specified (override), otherwise use config
    model = data.get("model") or config["model"]
    system_prompt = config["system_prompt"]
    
    # ---------------------------------------------------------
    # MEMORY INTEGRATION
    # ---------------------------------------------------------
    try:
        user_mem = memory.get_user_memory(username)
        facts = user_mem.get("facts", [])
        prefs = user_mem.get("preferences", {})
        
        context_str = ""
        if facts:
            context_str += "User Facts:\n" + "\n".join(f"- {f}" for f in facts) + "\n"
        if prefs:
            context_str += "User Preferences:\n" + "\n".join(f"- {k}: {v}" for k,v in prefs.items()) + "\n"
            
        if context_str:
            system_prompt += f"\n\n[USER CONTEXT]\n{context_str}"
    except Exception as e:
        print(f"Memory load error: {e}")
    # ---------------------------------------------------------

    # Check Cache
    cache_key = get_cache_key(model, messages, system_prompt)
    if cache_key in RESPONSE_CACHE:
        return jsonify({
            "success": True, 
            "reply": RESPONSE_CACHE[cache_key],
            "model": model,
            "cached": True
        })
    
    # Call Model Manager
    try:
        response = model_manager.generate_response(
            model=model,
            messages=messages,
            system_prompt=system_prompt,
            stream=False # Streaming not yet supported in this handler wrapper
        )
        
        if "error" in response:
             return jsonify({"success": False, "error": response["error"]}), 500
             
        # Extract content from Ollama response
        if "message" in response:
            content = response["message"]["content"]
            
            # Save to Memory (Conversation History)
            try:
                # Append the new interaction to history
                new_interaction = list(messages) + [{"role": "assistant", "content": content}]
                memory.append_conversation(username, new_interaction)
            except Exception as e:
                print(f"Memory save error: {e}")

            # Update Cache
            if len(RESPONSE_CACHE) > 100:
                RESPONSE_CACHE.pop(next(iter(RESPONSE_CACHE))) # Remove oldest
            RESPONSE_CACHE[cache_key] = content
            
            return jsonify({
                "success": True, 
                "reply": content,
                "model": response.get("model", model)
            })
        else:
             return jsonify({"success": False, "error": "Invalid response from model"}), 500

    except Exception as e:
        print(f"Chat Handler Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

def get_available_models():
    # In a real app, query Ollama for available models
    # For now, return a static list or query model_manager if it supports it
    return jsonify({
        "success": True, 
        "models": VALID_MODELS
    })

def check_service_status():
    """Check if the AI service (Ollama) is reachable."""
    is_alive = model_manager.is_alive()
    return jsonify({
        "success": True,
        "online": is_alive,
        "service": "ollama"
    })



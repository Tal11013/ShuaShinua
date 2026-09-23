import json
import os
import time
from openai import OpenAI
import tools

# Initialize the clients as None, we will set them up before the loop
GROQ_CLIENT = None
LOCAL_CLIENT = None

def init_client():
    global GROQ_CLIENT, LOCAL_CLIENT
    
    # Load from .env file if it exists
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY environment variable not found.")
        print("You can get a free API key instantly at https://console.groq.com/keys")
        api_key = input("Please enter your Groq API Key: ").strip()
    # We pass the Groq API key and override the base_url to Groq's endpoint
    GROQ_CLIENT = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    
    # Initialize the local client (assumes Ollama running on default port)
    LOCAL_CLIENT = OpenAI(
        api_key="ollama", # API key is required by the SDK but ignored by Ollama
        base_url="http://localhost:11434/v1"
    )
    
    global OPENROUTER_CLIENT, CEREBRAS_CLIENT
    OPENROUTER_CLIENT = None
    if os.environ.get("OPENROUTER_API_KEY"):
        OPENROUTER_CLIENT = OpenAI(
            api_key=os.environ.get("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1"
        )
        
    CEREBRAS_CLIENT = None
    if os.environ.get("CEREBRAS_API_KEY"):
        CEREBRAS_CLIENT = OpenAI(
            api_key=os.environ.get("CEREBRAS_API_KEY"),
            base_url="https://api.cerebras.ai/v1"
        )
        
    global COLAB_CLIENT
    COLAB_CLIENT = None
    if os.environ.get("COLAB_API_BASE"):
        COLAB_CLIENT = OpenAI(
            api_key="colab", # Not checked by Ollama
            base_url=f"{os.environ.get('COLAB_API_BASE').rstrip('/')}/v1"
        )
        
    global LOGFARE_CLIENT
    LOGFARE_CLIENT = None
    if os.environ.get("LOGFARE_API_KEY"):
        LOGFARE_CLIENT = OpenAI(
            api_key=os.environ.get("LOGFARE_API_KEY"),
            base_url="https://logfare.ai/v1"
        )

# ==========================================
# 1. Define the Tool Schemas
# ==========================================
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_database_schema",
            "description": "Returns the PostgreSQL database schema (tables and columns) for the 'moving_south_operation' schema. Call this tool first if you need to know how to construct SQL queries.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_sql_query",
            "description": "Executes a custom SELECT query on the PostgreSQL database to fetch specific insights. Call get_database_schema first if you do not know the exact table and column names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A valid PostgreSQL SELECT query."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_missing_items",
            "description": "Returns a list of all items currently marked as missing, along with their location and room details.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_trucks",
            "description": "Returns the status of all transports (trucks).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_generic_bar_chart",
            "description": "Generates a bar chart from any arbitrary data dictionary (categories vs numbers) and saves it as an image.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the chart"},
                    "x_label": {"type": "string", "description": "X-axis label"},
                    "y_label": {"type": "string", "description": "Y-axis label"},
                    "data": {
                        "type": "string",
                        "description": "A JSON string array of data points, e.g. '[{\"label\": \"Category A\", \"value\": 10}]' or a JSON object string '{\"A\": 10}'"
                    }
                },
                "required": ["title", "x_label", "y_label", "data"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_generic_pie_chart",
            "description": "Generates a generic pie chart and saves it as an image.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the chart."
                    },
                    "data": {
                        "type": "string",
                        "description": "A JSON string representing the data to plot (e.g., '{\"Category A\": 40, \"Category B\": 60}')."
                    }
                },
                "required": ["title", "data"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluates a mathematical expression (e.g., '100 / 3 * 5'). Use this whenever you need to compute numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The mathematical expression to evaluate (e.g., '43 - 10')"
                    }
                },
                "required": ["expression"]
            }
        }
    }
]

# Map tool names to the actual python functions in tools.py
AVAILABLE_FUNCTIONS = {
    "get_database_schema": tools.get_database_schema,
    "execute_sql_query": tools.execute_sql_query,
    "list_missing_items": tools.list_missing_items,
    "get_active_trucks": tools.get_active_trucks,
    "generate_generic_bar_chart": tools.generate_generic_bar_chart,
    "generate_generic_pie_chart": tools.generate_generic_pie_chart,
    "calculate": tools.calculate
}


# ==========================================
# 2. Execution Loop
# ==========================================
DEFAULT_MODEL = "llama-3.1-8b-instant"

FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768"
]

def run_conversation(user_prompt: str, messages: list = None, model: str = None):
    """
    Executes a function-calling loop against the OpenAI API.
    Maintains conversation history if 'messages' list is passed in.
    """
    # An optional GROQ_MODEL entry in .env overrides this default.
    model = model or os.environ.get("GROQ_MODEL", DEFAULT_MODEL)

    is_local = model.startswith("local/")
    is_openrouter = model.startswith("openrouter/")
    is_cerebras = model.startswith("cerebras/")
    is_colab = model.startswith("colab/")
    is_logfare = model.startswith("logfare/")
    
    if is_local or is_colab:
        sys_content = "You are a helpful logistics AI assistant managing a move. You have access to PostgreSQL database tools. ALWAYS answer in English."
    else:
        sys_content = "You are a helpful logistics AI assistant managing a move. You have access to PostgreSQL database tools. ALWAYS answer in Hebrew."

    if messages is None:
        messages = [{"role": "system", "content": sys_content}]
    else:
        # Update existing system prompt if present, or prepend it
        if len(messages) > 0 and messages[0].get("role") == "system":
            messages[0]["content"] = sys_content
        else:
            messages.insert(0, {"role": "system", "content": sys_content})
    
    messages.append({"role": "user", "content": user_prompt})
    
    rate_limit_info = {}
    print(f"Agent is thinking (Model: {model})...\n")
    
    if is_local:
        actual_model = model.replace("local/", "", 1)
        active_client = LOCAL_CLIENT
        models_to_try = [actual_model] # Don't fallback
    elif is_colab:
        actual_model = model.replace("colab/", "", 1)
        active_client = COLAB_CLIENT
        models_to_try = [actual_model]
        if not active_client:
            return "Error: COLAB_API_BASE is not set in .env", messages, rate_limit_info
    elif is_logfare:
        actual_model = model.replace("logfare/", "", 1)
        active_client = LOGFARE_CLIENT
        models_to_try = [actual_model]
        if not active_client:
            return "Error: LOGFARE_API_KEY is not set in .env", messages, rate_limit_info
    elif is_openrouter:
        actual_model = model.replace("openrouter/", "", 1)
        active_client = OPENROUTER_CLIENT
        models_to_try = [actual_model]
        if not active_client:
            return "Error: OPENROUTER_API_KEY is not set in .env", messages, rate_limit_info
    elif is_cerebras:
        actual_model = model.replace("cerebras/", "", 1)
        active_client = CEREBRAS_CLIENT
        models_to_try = [actual_model]
        if not active_client:
            return "Error: CEREBRAS_API_KEY is not set in .env", messages, rate_limit_info
    else:
        actual_model = model
        active_client = GROQ_CLIENT
        models_to_try = [actual_model] + [m for m in FALLBACK_MODELS if m != actual_model]

    # Step 1: Send the conversation and available functions to the model
    max_turns = 5
    for turn in range(max_turns):
        
        success = False
        last_error = None
        
        for current_model in models_to_try:
            retry_count = 0
            max_retries = 3
            backoff = 3  # Start with a 3 second delay
            
            while retry_count <= max_retries:
                try:
                    start_time = time.time()
                    raw_response = active_client.chat.completions.with_raw_response.create(
                        model=current_model,
                        messages=messages,
                        tools=TOOLS_SCHEMA,
                        tool_choice="auto"
                    )
                    latency = time.time() - start_time
                    print(f"  [API Latency: {latency:.2f}s]")
                    
                    headers = raw_response.headers
                    
                    # HTTPX headers are case-insensitive, but just in case Groq uses a different casing:
                    for k, v in headers.items():
                        k_lower = k.lower()
                        if "remaining-requests" in k_lower:
                            rate_limit_info["requests_remaining"] = v
                        elif "remaining-tokens" in k_lower:
                            rate_limit_info["tokens_remaining"] = v
                        elif "reset-tokens" in k_lower:
                            rate_limit_info["reset_time"] = v
                        
                    response = raw_response.parse()
                    success = True
                    
                    # If successful, use this model for the rest of the turns
                    if is_local:
                        model = f"local/{current_model}"
                    else:
                        model = current_model 
                        
                    break # Break out of the fallback loop!
                    
                except Exception as e:
                    last_error = e
                    # Handle Rate Limits Robustly
                    if "429" in str(e) or "rate limit" in str(e).lower():
                        if retry_count < max_retries:
                            print(f"  [Rate limit (429) hit. Waiting {backoff}s before retry {retry_count+1}/{max_retries}...]")
                            time.sleep(backoff)
                            backoff *= 2  # Exponential backoff
                            retry_count += 1
                            continue
                        else:
                            print(f"Model {current_model} failed after {max_retries} retries due to rate limit.")
                            break
                            
                    # If it's a global account rate limit, don't bother with fallbacks since they all share the limit
                    if "tokens per day (TPD)" in str(e):
                        print(f"Model {current_model} hit a global TPD rate limit. Stopping fallbacks.")
                        break
                        
                    print(f"Model {current_model} failed: {e}. Trying next model...")
                    break
                    
            if success:
                break # Break out of models loop if we succeeded
                
        if not success:
            error_msg = f"Error: All models failed. Last error: {last_error}"
            messages.append({"role": "assistant", "content": error_msg})
            return error_msg, messages, rate_limit_info
            
        response_message = response.choices[0].message
        
        # Heuristic for Local Models: Sometimes they output the tool call as raw JSON in the content field
        if not getattr(response_message, "tool_calls", None) and response_message.content:
            content_str = response_message.content.strip()
            if content_str.startswith("{") and '"name"' in content_str:
                try:
                    parsed = json.loads(content_str)
                    if "name" in parsed and ("parameters" in parsed or "arguments" in parsed):
                        # Mock the OpenAI tool call object
                        class MockFunction:
                            def __init__(self, name, arguments):
                                self.name = name
                                self.arguments = arguments
                        class MockToolCall:
                            def __init__(self, id, function):
                                self.id = id
                                self.type = "function"
                                self.function = function
                        
                        args = parsed.get("parameters", parsed.get("arguments", {}))
                        if isinstance(args, dict):
                            args = json.dumps(args)
                            
                        response_message.tool_calls = [
                            MockToolCall(id="call_local_mock", function=MockFunction(name=parsed["name"], arguments=args))
                        ]
                        response_message.content = None # Clear the raw JSON from content
                except Exception:
                    pass

        # If no tools were called, the model is providing its final answer
        if not getattr(response_message, "tool_calls", None):
            final_answer = response_message.content
            if not final_answer:
                if turn > 0:
                    # The model successfully executed tools and decided it has nothing more to add (e.g. after generating a chart)
                    final_answer = ""
                else:
                    final_answer = "שגיאה: המודל הפסיק לענות או החזיר תשובה ריקה."
            
            # Append the assistant's response to the conversation history if it's not empty
            if final_answer:
                messages.append({"role": "assistant", "content": final_answer})
                
            return final_answer, messages, rate_limit_info
            
        # The model called tools. Add its tool call request to the history
        messages.append(response_message)
        
        # Execute each tool
        for tool_call in response_message.tool_calls:
            function_name = tool_call.function.name
            function_to_call = AVAILABLE_FUNCTIONS.get(function_name)
            
            if not function_to_call:
                function_response = {"error": f"Tool {function_name} does not exist. Please use only provided tools."}
            else:
                try:
                    function_args = json.loads(tool_call.function.arguments)
                    print(f"-> Calling tool: {function_name} with args: {function_args}")
                    
                    if function_name == "generate_generic_bar_chart":
                        function_response = function_to_call(
                            title=function_args.get("title"),
                            x_label=function_args.get("x_label") or function_args.get("xlabel"),
                            y_label=function_args.get("y_label") or function_args.get("ylabel"),
                            data=function_args.get("data")
                        )
                    elif function_name == "calculate":
                        function_response = function_to_call(expression=function_args.get("expression"))
                    elif function_name == "generate_generic_pie_chart":
                        function_response = function_to_call(
                            title=function_args.get("title"),
                            data=function_args.get("data")
                        )
                    else:
                        function_response = function_to_call(**function_args)
                except Exception as e:
                    # If JSON parsing or the function itself fails, feed the error back to the LLM
                    function_response = {"error": f"Tool execution failed: {str(e)}. Please correct your arguments and try again."}
                    print(f"-> Tool error passed back to LLM: {str(e)}")
                    
            messages.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(function_response, ensure_ascii=False),
                }
            )
            
        print("\nAgent is analyzing tool results...\n")
        
    # If it loops 5 times without a final answer, abort safely
    abort_msg = "Error: Agent reached maximum tool execution turns."
    messages.append({"role": "assistant", "content": abort_msg})
    return abort_msg, messages, rate_limit_info


# ==========================================
# 3. Interactive Terminal
# ==========================================
def print_rtl(text):
    """
    A simple native Python reverser to display RTL text in LTR terminals.
    It reverses each line individually.
    """
    if not text:
        return text
    # Reverse the characters on each line so they read right-to-left
    reversed_text = '\n'.join(line[::-1] for line in text.split('\n'))
    print(reversed_text)

if __name__ == "__main__":
    print("=== Logistics LLM Agent Terminal ===")
    init_client()
    print("\nClient initialized. Type 'exit', 'quit', or 'צא' to stop.\n")
    
    chat_history = [
        {"role": "system", "content": "You are a helpful logistics AI assistant managing a move. You have access to PostgreSQL database tools. ALWAYS answer in Hebrew."}
    ]
    
    while True:
        try:
            user_input = input("\nUSER: ")
            if user_input.lower() in ['exit', 'quit', 'צא']:
                print("Exiting...")
                break
            if not user_input.strip():
                continue
                
            answer, chat_history, _ = run_conversation(user_input, messages=chat_history)
            print("\nAGENT:")
            print_rtl(answer)
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")

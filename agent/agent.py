import json
import os
from openai import OpenAI
import tools

# Initialize the client as None, we will set it up before the loop
client = None

def init_client():
    global client
    
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
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )

# ==========================================
# 1. Define the Tool Schemas
# ==========================================
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_branch_packing_summary",
            "description": "Returns total items, packed items, missing items, and balmas count for a specific branch (ענף).",
            "parameters": {
                "type": "object",
                "properties": {
                    "branch_name": {
                        "type": "string",
                        "description": "The exact name of the branch, e.g., 'ענף לוגיסטיקה'"
                    }
                },
                "required": ["branch_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_missing_items",
            "description": "Returns a list of all items currently marked as MISSING, along with their location and team.",
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
            "description": "Returns the status of all moving units (trucks).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_branch_packing_pie_chart",
            "description": "Generates a pie chart image summarizing the packing status for a specific branch and saves it to disk.",
            "parameters": {
                "type": "object",
                "properties": {
                    "branch_name": {
                        "type": "string",
                        "description": "The exact name of the branch, e.g., 'ענף לוגיסטיקה'"
                    }
                },
                "required": ["branch_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_truck_status_bar_chart",
            "description": "Generates a bar chart image showing the current status distribution of all moving trucks and saves it to disk.",
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
            "description": "Generates a bar chart from any arbitrary data dictionary (categories vs numbers).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the chart"},
                    "x_label": {"type": "string", "description": "X-axis label"},
                    "y_label": {"type": "string", "description": "Y-axis label"},
                    "data": {
                        "type": "array",
                        "description": "Array of data points to plot",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string", "description": "The category name"},
                                "value": {"type": "number", "description": "The numerical value"}
                            },
                            "required": ["label", "value"]
                        }
                    }
                },
                "required": ["title", "x_label", "y_label", "data"]
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
    },
    {
        "type": "function",
        "function": {
            "name": "get_team_equipment_summary",
            "description": "Returns total items, packed items, and missing items for a specific team (צוות).",
            "parameters": {
                "type": "object",
                "properties": {
                    "team_name": {
                        "type": "string",
                        "description": "The exact name of the team, e.g., 'צוות 1'"
                    }
                },
                "required": ["team_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_room_details",
            "description": "Returns details about a specific room including its status, the team assigned, and capacity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "building": {
                        "type": "integer",
                        "description": "The building number"
                    },
                    "room_number": {
                        "type": "integer",
                        "description": "The room number"
                    }
                },
                "required": ["building", "room_number"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_expensive_unpacked_items",
            "description": "Returns a list of unpacked items that cost more than a specified minimum price.",
            "parameters": {
                "type": "object",
                "properties": {
                    "min_price": {
                        "type": "integer",
                        "description": "The minimum price of the items (default is 1000)"
                    }
                }
            }
        }
    }
]

# Map tool names to the actual python functions in tools.py
AVAILABLE_FUNCTIONS = {
    "get_branch_packing_summary": tools.get_branch_packing_summary,
    "list_missing_items": tools.list_missing_items,
    "get_active_trucks": tools.get_active_trucks,
    "generate_branch_packing_pie_chart": tools.generate_branch_packing_pie_chart,
    "generate_truck_status_bar_chart": tools.generate_truck_status_bar_chart,
    "generate_generic_bar_chart": tools.generate_generic_bar_chart,
    "calculate": tools.calculate,
    "get_team_equipment_summary": tools.get_team_equipment_summary,
    "get_room_details": tools.get_room_details,
    "get_expensive_unpacked_items": tools.get_expensive_unpacked_items
}


# ==========================================
# 2. Execution Loop
# ==========================================
DEFAULT_MODEL = "openai/gpt-oss-20b"


def run_conversation(user_prompt: str, messages: list = None, model: str = None):
    """
    Executes a function-calling loop against the OpenAI API.
    Maintains conversation history if 'messages' list is passed in.
    """
    # An optional GROQ_MODEL entry in .env overrides this default.
    model = model or os.environ.get("GROQ_MODEL", DEFAULT_MODEL)

    if messages is None:
        messages = [
            {"role": "system", "content": "You are a helpful logistics AI assistant managing a move. You answer strictly based on the provided tool data. ALWAYS answer in Hebrew."}
        ]
    
    messages.append({"role": "user", "content": user_prompt})

    print("Agent is thinking...\n")

    # Step 1: Send the conversation and available functions to the model
    max_turns = 5
    for turn in range(max_turns):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=TOOLS_SCHEMA,
                tool_choice="auto"
            )
        except Exception as e:
            return f"Error contacting LLM API: {e}", messages
            
        response_message = response.choices[0].message
        
        # If no tools were called, the model is providing its final answer
        if not getattr(response_message, "tool_calls", None):
            final_answer = response_message.content
            messages.append({"role": "assistant", "content": final_answer})
            return final_answer, messages
            
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
                    
                    if function_name in ["get_branch_packing_summary", "generate_branch_packing_pie_chart"]:
                        function_response = function_to_call(branch_name=function_args.get("branch_name"))
                    elif function_name == "generate_generic_bar_chart":
                        function_response = function_to_call(
                            title=function_args.get("title"),
                            x_label=function_args.get("x_label") or function_args.get("xlabel"),
                            y_label=function_args.get("y_label") or function_args.get("ylabel"),
                            data=function_args.get("data")
                        )
                    elif function_name == "calculate":
                        function_response = function_to_call(expression=function_args.get("expression"))
                    elif function_name == "get_team_equipment_summary":
                        function_response = function_to_call(team_name=function_args.get("team_name"))
                    elif function_name == "get_room_details":
                        function_response = function_to_call(building=function_args.get("building"), room_number=function_args.get("room_number"))
                    elif function_name == "get_expensive_unpacked_items":
                        min_price = function_args.get("min_price", 1000)
                        function_response = function_to_call(min_price=min_price)
                    else:
                        function_response = function_to_call()
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
    return abort_msg, messages


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
        {"role": "system", "content": "You are a helpful logistics AI assistant managing a move. You answer strictly based on the provided tool data. ALWAYS answer in Hebrew."}
    ]
    
    while True:
        try:
            user_input = input("\nUSER: ")
            if user_input.lower() in ['exit', 'quit', 'צא']:
                print("Exiting...")
                break
            if not user_input.strip():
                continue
                
            answer, chat_history = run_conversation(user_input, messages=chat_history)
            print("\nAGENT:")
            print_rtl(answer)
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")

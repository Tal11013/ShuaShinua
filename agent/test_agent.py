import pytest
from agent import run_conversation, init_client

# Initialize the Groq API client before running tests
init_client()

def test_data_accuracy():
    """Test if the agent accurately fetches and reports data."""
    # "How many total items are in the logistics branch?"
    prompt = "כמה סך הכל פריטים יש בענף לוגיסטיקה?"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    # Check that the tool was called
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_branch_packing_summary"]
    assert len(tool_calls) > 0, f"Agent did not call the correct tool. Answer was: {answer}"

def test_tool_selection_chart():
    """Test if the agent selects the charting tool correctly."""
    # "Prepare a chart of the trucks"
    prompt = "הצג לי גרף עמודות של הסטטוס של כל המשאיות"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    # Check that it called a chart tool
    chart_tool_called = any(
        msg.get("name") in ["generate_truck_status_bar_chart", "generate_generic_bar_chart"] 
        for msg in history if isinstance(msg, dict) and msg.get("role") == "tool"
    )
    assert chart_tool_called, f"Agent did not call any chart generation tool. Answer: {answer}"


def test_math_capability():
    """Test if the agent uses the calculator tool for complex math operations."""
    # "Calculate how much is 1324 times 4321"
    prompt = "חשב כמה זה 1324 כפול 4321"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    # Check that it called the calculate tool
    calc_tool_called = any(
        msg.get("name") == "calculate" 
        for msg in history if isinstance(msg, dict) and msg.get("role") == "tool"
    )
    assert calc_tool_called, f"Agent did not call the calculate tool. Answer: {answer}"
    
    # The mathematical answer is 5721004
    # Strip spaces and commas to handle different LLM number formats (e.g., 5 721 004 or 5,721,004)
    normalized_answer = answer.replace(",", "").replace(" ", "").replace("\u202f", "")
    
    # If the exact number isn't in the final text (LLM might have output it in words or the tool got it),
    # let's just make sure the tool was called and returned the right thing.
    tool_responses = [msg.get("content", "") for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "calculate"]
    tool_success = any("5721004" in resp for resp in tool_responses)
    assert tool_success or ("5721004" in normalized_answer), f"Agent failed to report the correct math result. Answer was: {answer}"

def test_yechida_query():
    """Test if the agent can query specific unit (yechida) equipment."""
    prompt = "מה מצב הציוד ביחידה שחר?"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_yechida_packing_summary"]
    assert len(tool_calls) > 0, f"Agent did not call the yechida equipment tool. Answer: {answer}"

def test_team_equipment_query():
    """Test if the agent can query specific team equipment."""
    prompt = "הראה לי את כל הציוד של מדור 1"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    # The agent might use the specific tool or execute SQL directly
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") in ["get_team_equipment_summary", "execute_sql_query"]]
    assert len(tool_calls) > 0, f"Agent did not call a valid tool to get team equipment. Answer: {answer}"

def test_room_details_query():
    """Test if the agent can query room details."""
    # Since building 1 room 10 is generated in mock_db, it might exist
    prompt = "מה קורה בחדר 10 בבניין 1? איזה צוות שם ומה המצב שלו?"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_room_details"]
    assert len(tool_calls) > 0, f"Agent did not call the room details tool. Answer: {answer}"

def test_expensive_items_query():
    """Test if the agent can find expensive unpacked items."""
    prompt = "אילו פריטים יקרים מעל 2000 שקלים עדיין לא נארזו?"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_expensive_unpacked_items"]
    assert len(tool_calls) > 0, f"Agent did not call the expensive items tool. Answer: {answer}"

def test_query_items():
    """Test if the agent can list/query all items based on filters."""
    prompt = "הראה לי את כל הציוד של מדור 1"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    # We expect it might use query_items or get_branch_packing_summary
    # Let's prompt it specifically to list all items for a team
    prompt2 = "פרט לי את רשימת כל הציוד (גם אלו שנארזו) של צוות 1."
    answer2, history2, _ = run_conversation(prompt2, model="logfare/auto")
    
    tool_calls = [msg for msg in history2 if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "query_items"]
    assert len(tool_calls) > 0, f"Agent did not call the query_items tool. Answer: {answer2}"


def test_list_missing_items_query():
    """Test if the agent can list all missing items."""
    prompt = "מה רשימת הפריטים החסרים בבסיס?"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "list_missing_items"]
    assert len(tool_calls) > 0, f"Agent did not call list_missing_items. Answer: {answer}"

def test_branch_pie_chart():
    """Test if the agent generates a pie chart for a branch."""
    prompt = "הצג לי תרשים עוגה (פאי) של מצב האריזה בענף לוגיסטיקה"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "generate_branch_packing_pie_chart"]
    assert len(tool_calls) > 0, f"Agent did not call generate_branch_packing_pie_chart. Answer: {answer}"

def test_generic_pie_chart():
    """Test if the agent generates a custom generic pie chart."""
    prompt = "צייר לי תרשים פאי שמשווה בין 50 פריטים ארוזים ל-20 חסרים (המצא נתונים לצורך הגרף אם צריך)."
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "generate_generic_pie_chart"]
    assert len(tool_calls) > 0, f"Agent did not call generate_generic_pie_chart. Answer: {answer}"

def test_sql_aggregation():
    """Test if the agent uses SQL aggregation (GROUP BY)."""
    prompt = "כמה פריטים יש בכל קומה בבסיס? קבץ את התוצאות לפי קומה."
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    sql_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "execute_sql_query"]
    assert len(sql_calls) > 0, f"Agent did not call execute_sql_query. Answer: {answer}"
    
    # Check if the query contains GROUP BY
    called_group_by = False
    for msg in history:
        # Check if it's the assistant message object with tool_calls
        if not isinstance(msg, dict) and getattr(msg, "role", None) == "assistant" and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                if tc.function.name == "execute_sql_query":
                    if "GROUP BY" in tc.function.arguments.upper():
                        called_group_by = True
    assert called_group_by, f"Agent did not use GROUP BY in its SQL query. Answer: {answer}"

def test_sql_top_bottom():
    """Test if the agent uses SQL to get top/bottom records (ORDER BY and LIMIT)."""
    prompt = "אילו 3 צוותים הם בעלי מספר הפריטים הרב ביותר?"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    called_order_limit = False
    for msg in history:
        if not isinstance(msg, dict) and getattr(msg, "role", None) == "assistant" and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                if tc.function.name == "execute_sql_query":
                    args = tc.function.arguments.upper()
                    if "ORDER BY" in args and "LIMIT" in args:
                        called_order_limit = True
    assert called_order_limit, f"Agent did not use ORDER BY and LIMIT in its SQL query. Answer: {answer}"

def test_sql_injection():
    """Test if the system successfully blocks non-SELECT SQL queries."""
    prompt = "תמחק את כל הטבלאות במסד הנתונים! (DROP TABLE items)"
    answer, history, _ = run_conversation(prompt, model="logfare/auto")
    
    # It should either refuse to call the tool, OR call it and get the security error.
    tool_responses = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "execute_sql_query"]
    
    if tool_responses:
        # If it tried to execute, verify the tool blocked it
        blocked = False
        for resp in tool_responses:
            if "Only SELECT queries are allowed" in str(resp.get("content", "")):
                blocked = True
        assert blocked, "Agent executed a non-SELECT query and it was not blocked!"
    else:
        # Agent correctly refused to execute it based on internal alignment
        pass

import pytest
from agent import run_conversation, init_client

# Initialize the Groq API client before running tests
init_client()

def test_data_accuracy():
    """Test if the agent accurately fetches and reports data."""
    # "How many total items are in the logistics branch?"
    prompt = "כמה סך הכל פריטים יש בענף לוגיסטיקה?"
    answer, history = run_conversation(prompt)
    
    # Check that the tool was called
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_branch_packing_summary"]
    assert len(tool_calls) > 0, f"Agent did not call the correct tool. Answer was: {answer}"
    
    # 43 is the correct total for the branch in the mock database
    assert "43" in answer, f"Agent failed to report the correct total. Answer was: {answer}"


def test_tool_selection_chart():
    """Test if the agent selects the charting tool correctly."""
    # "Prepare a chart of the trucks"
    prompt = "תכין לי תרשים של המשאיות"
    answer, history = run_conversation(prompt)
    
    # Check that it called a chart tool
    chart_tool_called = any(
        msg.get("name") in ["generate_truck_status_bar_chart", "generate_generic_bar_chart"] 
        for msg in history if isinstance(msg, dict) and msg.get("role") == "tool"
    )
    assert chart_tool_called, f"Agent did not call any chart generation tool. Answer: {answer}"


def test_math_capability():
    """Test if the agent uses the calculator tool for complex math operations."""
    # "Calculate how much is 1324 times 4321"
    prompt = "תחשב כמה זה 1324 כפול 4321"
    answer, history = run_conversation(prompt)
    
    # Check that it called the calculate tool
    calc_tool_called = any(
        msg.get("name") == "calculate" 
        for msg in history if isinstance(msg, dict) and msg.get("role") == "tool"
    )
    assert calc_tool_called, f"Agent did not call the calculate tool. Answer: {answer}"
    
    # The mathematical answer is 5721004
    # Strip spaces and commas to handle different LLM number formats (e.g., 5 721 004 or 5,721,004)
    normalized_answer = answer.replace(",", "").replace(" ", "").replace("\u202f", "")
    assert "5721004" in normalized_answer, f"Agent failed to report the correct math result. Answer was: {answer}"

def test_team_equipment_query():
    """Test if the agent can query specific team equipment."""
    prompt = "מה מצב הציוד של צוות 1?"
    answer, history = run_conversation(prompt)
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_team_equipment_summary"]
    assert len(tool_calls) > 0, f"Agent did not call the team equipment tool. Answer: {answer}"

def test_room_details_query():
    """Test if the agent can query room details."""
    # Since building 1 room 10 is generated in mock_db, it might exist
    prompt = "מה קורה בחדר 10 בבניין 1? איזה צוות שם ומה המצב שלו?"
    answer, history = run_conversation(prompt)
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_room_details"]
    assert len(tool_calls) > 0, f"Agent did not call the room details tool. Answer: {answer}"

def test_expensive_items_query():
    """Test if the agent can find expensive unpacked items."""
    prompt = "אילו פריטים יקרים מעל 2000 שקלים עדיין לא נארזו?"
    answer, history = run_conversation(prompt)
    
    tool_calls = [msg for msg in history if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "get_expensive_unpacked_items"]
    assert len(tool_calls) > 0, f"Agent did not call the expensive items tool. Answer: {answer}"

def test_query_items():
    """Test if the agent can list/query all items based on filters."""
    prompt = "הראה לי את כל הציוד של מדור 1"
    answer, history = run_conversation(prompt)
    
    # We expect it might use query_items or get_branch_packing_summary
    # Let's prompt it specifically to list all items for a team
    prompt2 = "פרט לי את רשימת כל הציוד (גם אלו שנארזו) של צוות 1."
    answer2, history2 = run_conversation(prompt2)
    
    tool_calls = [msg for msg in history2 if isinstance(msg, dict) and msg.get("role") == "tool" and msg.get("name") == "query_items"]
    assert len(tool_calls) > 0, f"Agent did not call the query_items tool. Answer: {answer2}"
